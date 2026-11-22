import assert from "node:assert/strict";
import { setTimeout as wait } from "node:timers/promises";
import { test } from "node:test";
import { createLiveSession } from "../src/services/liveService.js";

const settings = { consent: true, mode: "general", language: "es" };

function setup(overrides = {}) {
  let view = {};
  let callbacks;
  let ended;
  let captures = 0;
  let stopped = 0;
  let destroyed = 0;
  const calls = [];
  const stream = {};
  const session = createLiveSession({
    capture: async () => {
      captures++;
      return { sourceStream: stream, audioStream: stream };
    },
    stopStream(source) { if (source === stream) stopped++; },
    watchTrack(_, onEnd) {
      ended = onEnd;
      return () => { ended = null; };
    },
    async openTranscription(options) {
      callbacks = options;
      return { async destruir() { destroyed++; } };
    },
    openAudioContext: () => ({ close: async () => {} }),
    getAccessToken: async () => "access",
    async analyze(payload, options) {
      calls.push({ payload, ...options });
      options.onEvent({ type: "pending", text: "" });
      options.onEvent({ type: "start", text: payload.fragment });
      options.onEvent({ type: "delta", text: "respuesta" });
      options.onEvent({ type: "complete" });
    },
    update(patch) { view = { ...view, ...patch }; },
    batchDelay: 0,
    minInterval: 0,
    ...overrides,
  });
  return {
    session, calls, view: () => view,
    stats: () => ({ captures, stopped, destroyed }),
    say: (texto, turn_order) => callbacks.onFinal({ texto, data: { turn_order } }),
    trackEnded: () => ended(),
    connection: () => callbacks.connection,
    callbacks: () => callbacks,
  };
}

test("requiere consentimiento y recupera errores de permisos", async () => {
  let count = 0;
  const fixture = setup({
    capture: async () => {
      count++;
      throw new DOMException("Denied", "NotAllowedError");
    },
  });
  await fixture.session.start({ ...settings, consent: false });
  assert.equal(count, 0);
  await fixture.session.start(settings);
  assert.equal(count, 1);
  assert.equal(fixture.view().status, "error");
  assert.match(fixture.view().error, /permisos/);
});

test("agrupa turnos, evita repetidos y continúa recibiendo lotes", async () => {
  const { session, say, calls, view, connection } = setup();
  await session.start(settings);
  assert.equal(connection().accessToken, "access");
  assert.equal(connection().tokenUrl, "/api/live-token");
  say("primero", 0);
  say("primero", 0);
  say("segundo", 1);
  await wait(15);
  say("tercero", 2);
  await wait(15);
  assert.deepEqual(calls.map(({ payload }) => payload.fragment), ["primero segundo", "tercero"]);
  assert.equal(calls[1].payload.context, "primero segundo");
  assert.deepEqual(calls[1].payload.answered, ["primero segundo"]);
  assert.equal(view().entries[0].answer, "respuesta");
  session.stop();
});

test("pausa, reanuda y finaliza liberando audio y conexión, y limpia el historial", async () => {
  const { session, say, stats, view, connection } = setup();
  await session.start(settings);
  say("una pregunta", 0);
  await wait(15);
  const original = connection().signal;
  session.stop("paused");
  assert.equal(original.aborted, true);
  assert.equal(view().status, "paused");
  assert.equal(view().entries.length, 1);
  assert.deepEqual(stats(), { captures: 1, stopped: 1, destroyed: 1 });
  await session.start(settings, { resume: true });
  assert.equal(view().status, "listening");
  assert.equal(view().entries.length, 1);
  session.clear();
  assert.deepEqual(view().entries, []);
  assert.equal(view().transcript, "");
  session.stop();
  assert.equal(view().status, "finished");
  assert.deepEqual(stats(), { captures: 2, stopped: 2, destroyed: 2 });
});

test("desconectar el micrófono cancela el análisis e ignora eventos tardíos", async () => {
  const gate = Promise.withResolvers();
  const received = Promise.withResolvers();
  const { session, say, trackEnded, view, stats } = setup({
    async analyze(_, options) {
      options.onEvent({ type: "start", text: "pendiente" });
      received.resolve(options);
      await gate.promise;
      options.onEvent({ type: "delta", text: "tarde" });
    },
  });
  await session.start(settings);
  say("una pregunta", 0);
  const request = await received.promise;
  trackEnded();
  assert.equal(request.signal.aborted, true);
  assert.equal(view().status, "error");
  assert.match(view().error, /desconectó/);
  assert.equal(stats().stopped, 1);
  gate.resolve();
  await wait(0);
  assert.deepEqual(view().entries, []);
  assert.match(view().error, /desconectó/);
});

test("finalizar mientras se solicita permiso libera cualquier stream tardío", async () => {
  const waiting = Promise.withResolvers();
  const stream = {};
  let closed = 0;
  const stopped = [];
  const { session, view } = setup({
    capture: () => waiting.promise,
    stopStream: (value) => { if (value) stopped.push(value); },
    openAudioContext: () => ({ async close() { closed++; } }),
    openTranscription: () => assert.fail("No debe abrir conexión"),
  });
  const starting = session.start(settings);
  session.stop();
  waiting.resolve({ sourceStream: stream, audioStream: stream });
  await starting;
  assert.equal(view().status, "finished");
  assert.equal(closed, 1);
  assert.deepEqual(stopped, [stream]);
});

test("Nueva pregunta conserva el historial y descarta el análisis y el turno visibles", async () => {
  const obsolete = Promise.withResolvers();
  const gate = Promise.withResolvers();
  const requests = [];
  const { session, callbacks, say, view } = setup({
    async analyze(payload, options) {
      requests.push(payload.fragment);
      options.onEvent({ type: "start", text: payload.fragment });
      if (payload.fragment === "obsoleta") {
        obsolete.resolve(options);
        await gate.promise;
      }
      options.onEvent({ type: "delta", text: "respuesta de " + payload.fragment });
      options.onEvent({ type: "complete" });
    },
  });
  await session.start(settings);
  say("primera", 0);
  await wait(15);
  say("obsoleta", 1);
  const request = await obsolete.promise;
  callbacks().onParcial({ texto: "fragmento anterior", data: { turn_order: 2 } });
  session.newQuestion();
  assert.equal(request.signal.aborted, true);
  assert.equal(view().status, "listening");
  assert.equal(view().latest, null);
  assert.equal(view().transcript, "");
  assert.equal(view().partial, "");
  assert.deepEqual(view().entries.map((entry) => entry.question), ["primera"]);
  say("fragmento anterior", 2);
  gate.resolve();
  await wait(10);
  assert.equal(view().latest, null);
  assert.deepEqual(requests, ["primera", "obsoleta"]);
  say("nueva", 3);
  await wait(15);
  assert.equal(view().latest.question, "nueva");
  session.pause();
  session.newQuestion();
  assert.equal(view().status, "paused");
  assert.deepEqual(view().entries.map((entry) => entry.question), ["nueva", "primera"]);
  session.stop();
});

test("pausa conserva OpenAI en curso y un ejemplo en pausa reutiliza la respuesta sin capturar audio", async () => {
  const ready = Promise.withResolvers();
  const generation = Promise.withResolvers();
  const example = Promise.withResolvers();
  const calls = [];
  const { session, callbacks, say, stats, view } = setup({
    async analyze(payload, options) {
      calls.push(payload);
      if (payload.action === "example") {
        options.onEvent({ type: "delta", text: "Ejemplo" });
        await example.promise;
      } else {
        options.onEvent({ type: "start", text: payload.fragment });
        ready.resolve(options);
        await generation.promise;
        options.onEvent({ type: "delta", text: "Respuesta original" });
      }
      options.onEvent({ type: "complete" });
    },
  });
  await session.start(settings);
  const old = callbacks();
  say("pregunta inicial", 0);
  const request = await ready.promise;
  say("audio pendiente", 1);
  session.pause();
  assert.equal(old.connection.signal.aborted, true);
  assert.equal(request.signal.aborted, false);
  old.onFinal({ texto: "evento tardío", data: { turn_order: 2 } });
  generation.resolve();
  await wait(0);
  assert.equal(view().latest.answer, "Respuesta original");
  assert.equal(view().status, "paused");

  const asking = session.requestExample();
  await session.requestExample();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], {
    action: "example", mode: "general", language: "es", fragment: "pregunta inicial",
    context: "pregunta inicial", answer: "Respuesta original",
  });
  assert.equal(view().exampleDraft, "Ejemplo");
  example.resolve();
  await asking;
  assert.deepEqual(view().latest.examples, ["Ejemplo"]);
  assert.equal(view().latest.answer, "Respuesta original");
  assert.equal(view().status, "paused");
  assert.equal(stats().captures, 1);

  await session.start(settings, { resume: true });
  old.onFinal({ texto: "todavía tarde", data: { turn_order: 3 } });
  say("primer turno de la conexión nueva", 0);
  await wait(15);
  assert.equal(calls[2].fragment, "primer turno de la conexión nueva");
  session.stop();
});

test("reconecta la escucha una vez y espera la disponibilidad antes de indicar Escuchando", async () => {
  const recovery = Promise.withResolvers();
  let calls = 0;
  let callbacks;
  const { session, view } = setup({
    async openTranscription(options) {
      callbacks = options;
      if (++calls === 2) await recovery.promise;
      return { async destruir() {} };
    },
  });
  await session.start(settings);
  const first = callbacks;
  first.onError(new Error("se perdió la conexión"));
  assert.equal(first.connection.signal.aborted, true);
  assert.equal(view().status, "connecting");
  recovery.resolve();
  await wait(0);
  assert.equal(view().status, "listening");
  callbacks.onError(new Error("se perdió la conexión"));
  assert.equal(view().status, "error");
  assert.equal(calls, 2);
});
