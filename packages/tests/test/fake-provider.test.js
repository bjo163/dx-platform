import test from "../src/shim.js";
import assert from "node:assert/strict";
import { LocalModelSupport } from "@neuralforge/local";
import { startFakeProvider } from "../src/fake-provider-server.js";

console.log('LocalModelSupport:', LocalModelSupport);

async function useFakeProvider(t, options) {
  const fake = await startFakeProvider(options);
  t.after(() => fake.close());
  return fake;
}

test("the fake provider answers the Ollama endpoints without any outbound call", async (t) => {
  const fake = await useFakeProvider(t, { models: ["llama3:8b", "qwen2.5:3b"] });
  const local = new LocalModelSupport({ ollama: { host: fake.host, port: fake.port, model: "llama3:8b" } });

  assert.ok(await local.isOllamaAvailable(), "the fake endpoint answers");
  assert.deepEqual(await local.listOllamaModels(), ["llama3:8b", "qwen2.5:3b"]);
  assert.deepEqual(fake.requests.map((request) => request.path), ["/api/tags", "/api/tags"]);
});

test("the fake provider answers the LM Studio endpoints without any outbound call", async (t) => {
  const fake = await useFakeProvider(t, { models: ["lmstudio-local"] });
  const local = new LocalModelSupport({ lmstudio: { host: fake.host, port: fake.port, model: "lmstudio-local" } });

  assert.ok(await local.isLMStudioAvailable(), "the fake endpoint answers");
  assert.deepEqual(await local.listLMStudioModels(), ["lmstudio-local"]);
  assert.deepEqual(fake.requests.map((request) => request.path), ["/v1/models", "/v1/models"]);
});

test("an unconfigured local provider sends no request at all", async (t) => {
  const fake = await useFakeProvider(t);
  const local = new LocalModelSupport();

  assert.equal(await local.isOllamaAvailable(), false);
  assert.deepEqual(await local.listOllamaModels(), []);
  assert.equal(await local.isLMStudioAvailable(), false);
  assert.deepEqual(await local.listLMStudioModels(), []);
  assert.deepEqual(fake.requests, [], "nothing left the process, so no provider was reached");
});