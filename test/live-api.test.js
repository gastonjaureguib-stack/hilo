import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createLiveHandler } from "../server/live.js";
import { liveModes } from "../src/utils/liveModes.js";
import { analyzeLive } from "../src/services/liveService.js";

const input = { fragment: "cómo funciona", context: "", pending: "", answered: [], mode: "general" };
const auth = { Authorization: "Bearer allowed" };

async function setup(t, createResponse) {
  const identify = async (token) => token === "allowed" ? "user" : undefined;
  const app = express();
  app.use(express.json());
  app.all("/api/live-analyze", createLiveHandler("analyze", { identify, createResponse }));
  app.all("/api/live-token", createLiveHandler("token", { identify, getToken: async () => "temporary" }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    post: (body = input, { headers = auth, signal } = {}) => fetch(url + "/api/live-analyze", {
      method: "POST", headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body), signal,
    }),
  };
}

const classify = (questions, pending = "") => ({ status: "completed", output_text: JSON.stringify({ questions, pending }) });

async function* answer(text = "Explicación") {
  yield { type: "response.output_text.delta", delta: text };
  yield { type: "response.completed" };
}

function events(text) {
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

test("protege análisis y tokens, valida entradas y limita tokens por usuario", async (t) => {
  const { post, url } = await setup(t, () => assert.fail("No debe llamar a OpenAI"));
  assert.equal((await post(input, { headers: {} })).status, 401);
  assert.equal((await post(input, { headers: { Authorization: "Bearer incorrect" } })).status, 401);
  assert.equal((await post({ ...input, mode: "constructor" })).status, 400);
  assert.equal((await post({ ...input, mode: "traductor", language: "invalid" })).status, 400);
  assert.equal((await post({ ...input, fragment: "x".repeat(2401) })).status, 400);
  assert.equal((await fetch(url + "/api/live-token")).status, 401);
  assert.equal((await fetch(url + "/api/live-token", { method: "POST", headers: auth })).status, 405);
  for (let i = 0; i < 6; i++) {
    const response = await fetch(url + "/api/live-token", { headers: auth });
    assert.deepEqual(await response.json(), { token: "temporary" });
  }
  assert.equal((await fetch(url + "/api/live-token", { headers: auth })).status, 429);
});

test("procesa afirmaciones y preguntas truncadas sin generar respuestas", async (t) => {
  let calls = 0;
  const { post } = await setup(t, (params) => {
    assert.equal(params.stream, undefined);
    assert.equal(params.store, false);
    assert.equal(params.text.format.strict, true);
    assert.match(params.instructions, /incluso sin signos/);
    return classify([], calls++ ? "cómo se calcula el" : "");
  });
  const statement = await post({ ...input, fragment: "El resultado subió." });
  assert.deepEqual(events(await statement.text()), [{ type: "pending", text: "" }, { type: "done" }]);
  const partial = await post({ ...input, fragment: "cómo se calcula el" });
  assert.deepEqual(events(await partial.text()), [{ type: "pending", text: "cómo se calcula el" }, { type: "done" }]);
});

test("pasa contexto y preguntas incompletas, conserva el orden y filtra duplicados", async (t) => {
  const { post } = await setup(t, (params) => {
    if (params.stream) return answer();
    assert.deepEqual(JSON.parse(params.input), {
      fragmento: "promedio y para qué sirve",
      contexto: "Estamos hablando de estadística.",
      pendienteAnterior: "cómo se calcula el",
      respondidas: ["¿Para qué sirve?"],
    });
    return classify(["Cómo se calcula el promedio", "¿CÓMO se calcula el promedio?", "Para qué sirve", "¿Qué es la mediana?"]);
  });
  const response = await post({
    ...input, fragment: "promedio y para qué sirve", context: "Estamos hablando de estadística.",
    pending: "cómo se calcula el", answered: ["¿Para qué sirve?"],
  });
  const data = events(await response.text());
  assert.deepEqual(data.filter((event) => event.type === "start").map((event) => event.text),
    ["Cómo se calcula el promedio", "¿Qué es la mediana?"]);
  assert.equal(data.filter((event) => event.type === "complete").length, 2);
  assert.equal(data.at(-1).type, "done");
});

test("aplica instrucciones propias para los cinco modos y omite clasificación al traducir", async (t) => {
  const used = [];
  let classifications = 0;
  const { post } = await setup(t, (params) => {
    if (!params.stream) {
      classifications++;
      return classify(["¿Qué significa?"]);
    }
    used.push(params.instructions);
    assert.equal(params.store, false);
    return answer();
  });
  for (const mode of Object.keys(liveModes)) {
    const response = await post({ ...input, mode, language: "pt" });
    assert.equal(events(await response.text()).at(-1).type, "done");
  }
  assert.equal(classifications, 4);
  assert.equal(new Set(used).size, 5);
  assert.match(used[0], /Nunca inventes experiencia/);
  assert.match(used[3], /Portugués/);
});

test("transmite el primer delta antes de completar y rechaza solicitudes simultáneas", async (t) => {
  const gate = Promise.withResolvers();
  const { post } = await setup(t, (params) => params.stream ? (async function* () {
    yield { type: "response.output_text.delta", delta: "Primer fragmento" };
    await gate.promise;
    yield* answer(" final");
  })() : classify(["cómo funciona"]));
  try {
    const response = await post();
    assert.match(response.headers.get("content-type"), /ndjson/);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes("Primer fragmento")) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      received += decoder.decode(chunk.value, { stream: true });
    }
    assert.equal(received.includes('"type":"done"'), false);
    assert.equal((await post()).status, 429);
    gate.resolve();
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      received += decoder.decode(chunk.value, { stream: true });
    }
    assert.equal(events(received).at(-1).type, "done");
  } finally {
    gate.resolve();
  }
});

test("propaga fallos de clasificación y generación", async (t) => {
  let fail = true;
  const { post } = await setup(t, (params) => {
    if (fail) throw new Error("No mostrar datos del proveedor");
    if (!params.stream) return classify(["cómo funciona"]);
    return (async function* () { yield { type: "response.failed" }; })();
  });
  const rejected = await post();
  assert.equal(rejected.status, 502);
  assert.doesNotMatch(await rejected.text(), /datos del proveedor/);
  fail = false;
  const interrupted = await post();
  assert.equal(events(await interrupted.text()).at(-1).type, "error");
});

test("comunica el límite de uso de OpenAI con un error recuperable", async (t) => {
  const { post } = await setup(t, () => {
    throw Object.assign(new Error("quota"), { status: 429 });
  });
  const response = await post();
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /saldo de la cuenta/);
});

test("decodifica NDJSON repartido entre fragmentos y detecta cortes", async (t) => {
  const complete = Buffer.from('{"type":"delta","text":"ñ"}\n{"type":"done"}\n');
  const split = complete.indexOf(0xc3) + 1;
  const mock = t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(complete.subarray(0, split));
      controller.enqueue(complete.subarray(split));
      controller.close();
    },
  })));
  const received = [];
  await analyzeLive(input, { accessToken: "allowed", onEvent: (event) => received.push(event) });
  assert.deepEqual(received, [{ type: "delta", text: "ñ" }]);
  mock.mock.mockImplementation(async () => new Response('{"type":"delta","text":"corte"}\n'));
  await assert.rejects(analyzeLive(input, { onEvent() {} }), /interrumpió/);
});

test("abortar el cliente cancela la generación en el servidor", { timeout: 3000 }, async (t) => {
  const aborted = Promise.withResolvers();
  const { post } = await setup(t, (params, { signal }) => params.stream ? (async function* () {
    const closed = Promise.withResolvers();
    signal.addEventListener("abort", closed.resolve, { once: true });
    yield { type: "response.output_text.delta", delta: "Inicio" };
    await closed.promise;
    aborted.resolve();
  })() : classify(["cómo funciona"]));
  const controller = new AbortController();
  await post(input, { signal: controller.signal });
  controller.abort();
  await aborted.promise;
});
