export async function analyzeLive(input, { accessToken, signal, onEvent }) {
  const response = await fetch("/api/live-analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "No se pudo conectar con Hilo Live.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete = false;
  try {
    while (!complete) {
      const { value, done } = await reader.read();
      if (done) throw new Error("Se interrumpió la respuesta de Hilo Live.");
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const event = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (event.type === "error") throw new Error(event.text);
        if (event.type === "done") {
          complete = true;
          break;
        }
        onEvent(event);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function createLiveSession({
  capture, stopStream, watchTrack, openTranscription, openAudioContext,
  getAccessToken, analyze = analyzeLive, update,
  batchDelay = 450, minInterval = 1450,
}) {
  let connection;
  let request;
  let timer;
  let nextRequest = 0;
  let queued = "";
  let context = "";
  let pending = "";
  let lastTurn = "";
  let entries = [];
  let activeEntry;
  let startedAt = 0;
  let elapsed = 0;
  let preferences;

  function cancelAnalysis() {
    clearTimeout(timer);
    timer = null;
    request?.abort();
    request = null;
    queued = "";
    pending = "";
    lastTurn = "";
    if (activeEntry) {
      entries = entries.filter((entry) => entry !== activeEntry);
      update({ entries });
      activeEntry = null;
    }
    update({ partial: "", analyzing: false });
  }

  function stop(status = "finished", error = "") {
    const current = connection;
    connection = null;
    clearTimeout(current?.timeout);
    current?.controller.abort();
    current?.unwatch?.();
    stopStream(current?.stream);
    if (current?.transcription) {
      void current.transcription.destruir();
    } else if (current?.audio && current.audio.state !== "closed") {
      void current.audio.close().catch(() => {});
    }
    if (startedAt) elapsed += Date.now() - startedAt;
    startedAt = 0;
    cancelAnalysis();
    update({ status, error, elapsed });
  }

  function clear() {
    cancelAnalysis();
    context = "";
    entries = [];
    update({ entries, transcript: "", error: "" });
  }

  function schedule() {
    if (!connection || request || !queued) return;
    clearTimeout(timer);
    timer = setTimeout(processBatch, Math.max(batchDelay, nextRequest - Date.now()));
  }

  async function processBatch() {
    timer = null;
    const controller = new AbortController();
    request = controller;
    nextRequest = Date.now() + minInterval;
    const boundary = queued.lastIndexOf(" ", 2400);
    const size = queued.length <= 2400 ? queued.length : (boundary > 0 ? boundary : 2400);
    const fragment = queued.slice(0, size);
    queued = queued.slice(size).trimStart();
    update({ analyzing: true });
    try {
      const accessToken = await getAccessToken();
      controller.signal.throwIfAborted();
      await analyze({
        ...preferences,
        fragment,
        context,
        pending,
        answered: entries.filter((entry) => entry.complete && preferences.mode !== "traductor")
          .slice(0, 12).map((entry) => entry.question),
      }, {
        accessToken,
        signal: controller.signal,
        onEvent(event) {
          if (request !== controller) return;
          if (event.type === "pending") pending = event.text;
          if (event.type === "start") {
            activeEntry = { question: event.text, answer: "", complete: false };
            entries = [activeEntry, ...entries].slice(0, 50);
          }
          if (activeEntry && (event.type === "delta" || event.type === "complete")) {
            const entry = event.type === "delta"
              ? { ...activeEntry, answer: activeEntry.answer + event.text }
              : { ...activeEntry, complete: true };
            entries = [entry, ...entries.slice(1)];
            activeEntry = entry.complete ? null : entry;
          }
          update({ entries, error: "" });
        },
      });
      if (request === controller) update({ error: "" });
    } catch (error) {
      if (request !== controller) return;
      if (activeEntry) {
        entries = entries.filter((entry) => entry !== activeEntry);
        activeEntry = null;
      }
      pending = "";
      update({ entries, error: error.message });
    } finally {
      if (request === controller) {
        context = (context + " " + fragment).trim().slice(-3000);
        request = null;
        update({ analyzing: false });
        schedule();
      }
    }
  }

  async function start(options, { resume = false } = {}) {
    if (connection || !options.consent) return;
    if (!resume) {
      elapsed = 0;
      clear();
    }
    preferences = { mode: options.mode, language: options.language };
    const current = { controller: new AbortController() };
    connection = current;
    const { signal } = current.controller;
    const fail = (error) => {
      if (connection !== current) return;
      const message = error.name === "NotAllowedError" || error.name === "SecurityError"
        ? "El acceso al micrófono está bloqueado. Habilitalo en los permisos del navegador."
        : error.name === "NotFoundError"
          ? "No se encontró un micrófono disponible."
          : error.message || "No se pudo iniciar la escucha.";
      stop("error", message);
    };

    update({ status: "connecting", elapsed, error: "" });
    try {
      current.audio = openAudioContext();
      const { sourceStream, audioStream } = await capture();
      if (signal.aborted) {
        stopStream(sourceStream);
        return;
      }
      current.stream = sourceStream;
      current.unwatch = watchTrack(sourceStream, () => fail(new Error("Se desconectó el micrófono.")));
      current.timeout = setTimeout(() => fail(new Error("Se agotó el tiempo para conectar la escucha.")), 35_000);
      const accessToken = await getAccessToken();
      signal.throwIfAborted();
      const transcription = await openTranscription({
        stream: audioStream,
        audioContext: current.audio,
        connection: { tokenUrl: "/api/live-token", accessToken, inactivityTimeout: 30, signal },
        onParcial: ({ texto }) => {
          if (!signal.aborted) update({ partial: texto });
        },
        onFinal: ({ texto, data }) => {
          if (signal.aborted) return;
          const key = data?.turn_order ?? texto;
          if (key === lastTurn) return;
          lastTurn = key;
          update({ transcript: texto, partial: "" });
          queued = (queued + " " + texto).trim();
          if (queued.length > 12_000) {
            fail(new Error("La conversación avanzó más rápido que el análisis. Reanudá la escucha para continuar."));
            return;
          }
          if (!timer && !request) schedule();
        },
        onError: fail,
      });
      if (signal.aborted) {
        await transcription.destruir();
        return;
      }
      clearTimeout(current.timeout);
      current.transcription = transcription;
      startedAt = Date.now();
      update({ status: "listening", error: "" });
    } catch (error) {
      fail(error);
    }
  }

  function tick() {
    if (startedAt) update({ elapsed: elapsed + Date.now() - startedAt });
  }

  function interrupt() {
    if (connection) stop("paused");
  }

  return { start, stop, clear, tick, interrupt };
}
