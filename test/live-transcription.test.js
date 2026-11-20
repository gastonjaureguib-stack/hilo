import assert from "node:assert/strict";
import { test } from "node:test";
import { crearConexionAssembly, enviarAudioAssembly, terminarConexionAssembly } from "../src/services/assemblyService.js";

class Socket extends EventTarget {
  static OPEN = 1;
  static CONNECTING = 0;
  readyState = Socket.CONNECTING;
  sent = [];

  constructor(url) {
    super();
    this.url = new URL(url);
    queueMicrotask(() => {
      this.readyState = Socket.OPEN;
      this.onopen();
    });
  }

  send(message) {
    this.sent.push(message);
    if (message === '{"type":"Terminate"}') {
      queueMicrotask(() => this.onmessage({ data: '{"type":"Termination"}' }));
    }
  }

  close() {
    this.readyState = 3;
    this.onclose({ code: 1000, reason: "" });
    this.dispatchEvent(new Event("close"));
  }
}

test("Live envía el token autenticado y termina AssemblyAI al cancelar", async (t) => {
  t.mock.method(globalThis, "fetch", async (path, options) => {
    assert.equal(path, "/api/live-token");
    assert.equal(options.headers.Authorization, "Bearer access");
    return Response.json({ token: "temporary" });
  });
  const original = globalThis.WebSocket;
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const controller = new AbortController();
  const socket = await crearConexionAssembly({
    tokenUrl: "/api/live-token", accessToken: "access", inactivityTimeout: 30, signal: controller.signal,
  });
  assert.equal(socket.url.searchParams.get("inactivity_timeout"), "30");
  assert.equal(socket.url.searchParams.get("token"), "temporary");
  assert.equal(enviarAudioAssembly(socket, new ArrayBuffer(8)), true);
  controller.abort();
  assert.equal(enviarAudioAssembly(socket, new ArrayBuffer(8)), false);
  assert.equal((await terminarConexionAssembly(socket)).confirmada, true);
  assert.equal(socket.sent[1], '{"type":"Terminate"}');
  assert.equal(socket.readyState, 3);
});

test("el consumidor existente sigue usando el endpoint y flujo de Clase", async (t) => {
  t.mock.method(globalThis, "fetch", async (path, options) => {
    assert.equal(path, "/api/assembly-token");
    assert.equal(options.headers, undefined);
    return Response.json({ token: "legacy" });
  });
  const original = globalThis.WebSocket;
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = original; });
  const final = [];
  const socket = await crearConexionAssembly({ onFinal: ({ texto }) => final.push(texto) });
  assert.equal(socket.url.searchParams.get("speech_model"), "universal-3-5-pro");
  assert.equal(socket.url.searchParams.has("inactivity_timeout"), false);
  socket.onmessage({ data: '{"type":"Turn","transcript":"En clase","end_of_turn":true}' });
  assert.deepEqual(final, ["En clase"]);
  assert.equal((await terminarConexionAssembly(socket)).confirmada, true);
});
