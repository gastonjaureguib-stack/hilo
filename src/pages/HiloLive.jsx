import { useCallback, useEffect, useRef, useState } from "react";
import { capturarMicrofono, detenerStream, escucharFinCaptura } from "../audio/audioCapture.js";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { createLiveSession } from "../services/liveService.js";
import { crearSesionTranscripcion } from "../services/transcriptionService.js";
import { liveLanguages, liveModes } from "../utils/liveModes.js";
import { formatearTiempo } from "../utils/timeUtils.js";
import "../styles/live.css";

const labels = {
  connecting: "Conectando",
  listening: "Escuchando",
  paused: "En pausa",
  finished: "Sesión finalizada",
  error: "Error",
};

const initial = {
  status: "paused", started: false, elapsed: 0, entries: [], latest: null,
  transcript: "", partial: "", analyzing: false, exampleDraft: "", error: "",
};

function LiveSession() {
  const [view, setView] = useState(initial);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState("general");
  const [language, setLanguage] = useState("es");
  const [focused, setFocused] = useState(false);
  const session = useRef(null);

  useEffect(() => {
    const live = createLiveSession({
      capture: capturarMicrofono,
      stopStream: detenerStream,
      watchTrack: escucharFinCaptura,
      openTranscription: crearSesionTranscripcion,
      openAudioContext() {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) throw new Error("Este navegador no admite Web Audio.");
        const audio = new Context();
        void audio.resume().catch(() => {});
        return audio;
      },
      async getAccessToken() {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Iniciá sesión para usar Hilo Live.");
        return data.session.access_token;
      },
      update: (patch) => setView((current) => ({ ...current, ...patch })),
    });
    session.current = live;
    const clock = window.setInterval(live.tick, 250);
    const pause = () => live.interrupt();
    const onVisibility = () => { if (document.hidden) pause(); };
    window.addEventListener("pagehide", pause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(clock);
      window.removeEventListener("pagehide", pause);
      document.removeEventListener("visibilitychange", onVisibility);
      live.stop();
      session.current = null;
    };
  }, []);

  const { status, started, elapsed, entries, latest, transcript, partial, analyzing, exampleDraft, error } = view;
  const active = status === "listening";
  const connecting = status === "connecting";
  const running = connecting || active;
  const hasSession = started && status !== "finished";
  const translating = mode === "traductor";
  const history = entries.filter((entry) => entry !== latest);
  const toggleListening = useCallback(() => {
    if (running) session.current?.pause();
    else if (consent) void session.current?.start({ consent, mode, language }, { resume: hasSession });
  }, [running, consent, mode, language, hasSession]);

  useEffect(() => {
    function onSpace(event) {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.composedPath().some((target) => target instanceof Element && target.matches(
        "button, input, textarea, select, a[href], summary, label, audio[controls], video[controls], [tabindex], [contenteditable], [role=button], [role=link], [role=textbox], [role=combobox]",
      ))) return;
      if (!running && !consent) return;
      event.preventDefault();
      toggleListening();
    }
    window.addEventListener("keydown", onSpace);
    return () => window.removeEventListener("keydown", onSpace);
  }, [running, consent, toggleListening]);

  return (
    <div className="hilo-live" data-focus={focused}>
      <div className="live-heading" hidden={focused}>
        <h1>Hilo Live</h1>
        <time aria-label="Tiempo de escucha">{formatearTiempo(elapsed / 1000)}</time>
      </div>

      <section className="live-controls" aria-label="Configuración de escucha" hidden={focused}>
        <div className="live-settings">
          <label>Modo
            <select value={mode} disabled={hasSession} onChange={(event) => setMode(event.target.value)}>
              {Object.entries(liveModes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          {translating && <label>Traducir a
            <select value={language} disabled={hasSession} onChange={(event) => setLanguage(event.target.value)}>
              {Object.entries(liveLanguages).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>}
        </div>

        <label className="live-consent">
          <input type="checkbox" checked={consent} disabled={running} onChange={(event) => setConsent(event.target.checked)} />
          <span>Tengo el consentimiento de las personas que participan. AssemblyAI recibe el audio y OpenAI procesa la transcripción. Hilo conserva el historial solo en esta página.</span>
        </label>

        {hasSession && <div className="live-actions"><button onClick={() => session.current?.stop()}>Finalizar</button></div>}
      </section>

      <section className="live-answer" aria-labelledby="live-answer-heading">
        <div className="live-toolbar">
          <div className="live-status" role="status">
            <span><span className="live-dot" data-status={status} aria-hidden="true" />Micrófono: {labels[status]}</span>
          </div>
          <div className="live-actions">
            <button type="button" className="live-primary" aria-keyshortcuts="Space"
              disabled={!running && !consent} onClick={toggleListening}>
              {running ? "Pausar escucha" : "Reanudar escucha"}
            </button>
            <button type="button" onClick={() => session.current?.newQuestion()}>Nueva pregunta</button>
            {latest?.complete && <button type="button" disabled={analyzing || !consent}
              onClick={() => void session.current?.requestExample()}>
              Dame un ejemplo
            </button>}
            <button type="button" aria-pressed={focused} onClick={() => setFocused(!focused)}>
              {focused ? "Salir del modo concentración" : "Modo Concentración"}
            </button>
          </div>
        </div>
        <div className="live-answer-content" aria-busy={analyzing}>
          <h2 id="live-answer-heading">{translating ? "Traducción en vivo" : "Respuesta en vivo"}</h2>
          {latest && <p className="live-question">{latest.question}</p>}
          <p className={latest?.answer ? "live-answer-text" : "live-placeholder"}>
            {latest?.answer || (analyzing ? "Procesando la conversación…" : translating ? "La traducción aparecerá acá." : "La próxima pregunta y su respuesta aparecerán acá.")}
          </p>
          {(latest?.examples ?? []).concat(exampleDraft || []).map((example, index) => (
            <div className="live-example" key={index}>
              <h3>Ejemplo práctico</h3>
              <p className="live-answer-text">{example}</p>
            </div>
          ))}
          {error && <p className="live-error" role="alert">{error}</p>}
        </div>
      </section>

      <section className="live-transcript" hidden={focused}>
        <h2>Transcripción reciente</h2>
        <p>{partial || transcript || "El texto aparecerá al hablar."}</p>
      </section>

      <section className="live-history" aria-labelledby="live-history-heading" hidden={focused}>
        <div className="live-history-heading">
          <h2 id="live-history-heading">Historial de la sesión</h2>
          <button onClick={() => session.current?.clear()} disabled={!entries.length && !transcript && !partial && !analyzing}>Limpiar historial</button>
        </div>
        {history.length > 0 ? <ol>
          {history.map((entry, index) => <li key={index}>
            <p className="live-question">{entry.question}</p>
            <p>{entry.answer}</p>
            {entry.examples?.map((example, index) => <p key={index}>{example}</p>)}
          </li>)}
        </ol> : <p className="live-placeholder">Las respuestas anteriores aparecerán acá.</p>}
      </section>
    </div>
  );
}

export default function HiloLive() {
  const { user } = useAuth();
  return <LiveSession key={user.id} />;
}
