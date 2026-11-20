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
