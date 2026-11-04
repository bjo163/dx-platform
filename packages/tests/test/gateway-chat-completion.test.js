import test from "../src/shim.js";
import assert from "node:assert/strict";
import { executeGatewayChatCompletion } from "@wtagent/gateway";

test("gateway chat requests become provider jobs and return their final answer", async () => {
  const submitted = [];
  let reads = 0;
  const jobService = {
    createJob: async (input) => {
      submitted.push(input);
      return { jobId: "chat-job-1" };
    },
    getJob: async () => {
      reads += 1;
      return reads === 1
        ? { jobId: "chat-job-1", status: "running" }
        : { jobId: "chat-job-1", status: "completed", result: { message: "done" } };
    },
    cancelJob: async () => { throw new Error("completed requests must not be cancelled"); },
  };

  const result = await executeGatewayChatCompletion({
    jobService,
    model: "chatgpt",
    messages: [
      { role: "system", content: "Be concise." },
      { role: "user", content: "Hello" },
    ],
    projectRoot: "C:\\project",
    projectId: "selected-project",
    pollIntervalMs: 1,
  });

  assert.deepEqual(result, { status: "completed", jobId: "chat-job-1", message: "done" });
  assert.deepEqual(submitted, [{
    task: "SYSTEM:\nBe concise.\n\nUSER:\nHello",
    provider: "chatgpt",
    projectId: "selected-project",
    projectRoot: "C:\\project",
  }]);
});

test("gateway chat reports job failures without fabricating a completion", async () => {
  const jobService = {
    createJob: async () => ({ jobId: "chat-job-2" }),
    getJob: async () => ({
      jobId: "chat-job-2",
      status: "failed",
      error: { code: "PROVIDER_NOT_AUTHENTICATED", message: "Sign in first." },
    }),
    cancelJob: async () => null,
  };

  const result = await executeGatewayChatCompletion({
    jobService,
    model: "gemini",
    messages: [{ role: "user", content: "Hello" }],
    projectRoot: "C:\\project",
  });

  assert.deepEqual(result, {
    status: "failed",
    jobId: "chat-job-2",
    code: "PROVIDER_NOT_AUTHENTICATED",
    message: "Sign in first.",
  });
});

test("gateway chat cancels a provider job when the request times out", async () => {
  let cancelledJobId;
  const jobService = {
    createJob: async () => ({ jobId: "chat-job-3" }),
    getJob: async () => ({ jobId: "chat-job-3", status: "running" }),
    cancelJob: async (jobId) => { cancelledJobId = jobId; },
  };

  const result = await executeGatewayChatCompletion({
    jobService,
    model: "grok",
    messages: [{ role: "user", content: "Hello" }],
    projectRoot: "C:\\project",
    timeoutMs: 1,
    pollIntervalMs: 1,
  });

  assert.deepEqual(result, { status: "timeout", jobId: "chat-job-3" });
  assert.equal(cancelledJobId, "chat-job-3");
});
