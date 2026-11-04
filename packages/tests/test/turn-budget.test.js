import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentRuntime } from "@neuralforge/runtime/agent-runtime";
import { TaskSession } from "@neuralforge/session/task-session";
import { createDefaultToolRegistry } from "@neuralforge/tools/default-tools";
import { ToolRegistry } from "@neuralforge/tools/registry";
import { PolicyEngine } from "@neuralforge/policy/policy-engine";
import { FakeWebModelAdapter } from "@neuralforge/browser/fake-web-model-adapter";
import { DEFAULT_LIMITS } from "@neuralforge/shared/limits";
import { BrowserAdapterError } from "@neuralforge/shared/errors";

const envelope = (done, message, body = "") =>
  `<agent_response><done>${done}</done><message>${message}</message>${body}</agent_response>`;

const READ = (name) =>
  `<tool_call name="fs.read"><args><path>${name}</path></args></tool_call>`;

const emptyTurn = () => new BrowserAdapterError(
  "ChatGPT completed an assistant turn without any content.",
  { code: "EMPTY_ASSISTANT_RESPONSE" },
);

const invalidEnvelope =
  '<agent_response><done>true</done><message><![CDATA[<invoke name="fs.write" />]]></message></agent_response>';

// Backoff sleeps are real timers, so the harness defaults them to zero and each
// timing test opts back in to the growth it wants to observe.
async function harness(t, responses, {
  limits = {},
  random,
  registry = createDefaultToolRegistry(),
  prefix = "budget",
} = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `neuralforge-${prefix}-`));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const session = await TaskSession.create({
    sessionsDir: path.join(root, "sessions"),
    projectRoot: root,
    task: "budget",
  });
  const adapter = new FakeWebModelAdapter([...responses, "must not be read"]);
  const events = [];
  const runtime = new AgentRuntime({
    session,
    adapter,
    registry,
    policy: new PolicyEngine(),
    approval: async () => true,
    onEvent: (event) => events.push(event),
    limits: {
      ...DEFAULT_LIMITS,
      retryBackoffBaseMs: 0,
      retryBackoffMaxMs: 0,
      retryJitterMs: 0,
      ...limits,
    },
    random,
  });
  return { root, session, adapter, events, runtime };
}

const backoffs = (events) => events
  .filter((event) => event.type === "retry.backoff")
  .map((event) => event.payload);

test("an assistant message over the per-message budget never reaches the transcript", async (t) => {
  const { runtime, events } = await harness(t, [
    envelope("true", "x".repeat(120)),
  ], { limits: { maxAssistantMessageBytes: 100 }, prefix: "budget-message" });

  await assert.rejects(runtime.run(), (error) => {
    assert.equal(error.code, "ASSISTANT_MESSAGE_BYTES_EXCEEDED");
    assert.equal(error.recoverable, false);
    assert.deepEqual(error.details, { bytes: 120, limit: 100 });
    return true;
  });

  assert.equal(events.filter((event) => event.type === "run.completed").length, 0);
  const transcript = await runtime.session.readTranscript();
  assert.equal(
    transcript.items.filter(({ item }) => item.role === "assistant").length,
    0,
  );
});

test("tool results are charged against the per-turn byte budget", async (t) => {
  const { root, runtime, events } = await harness(t, [
    envelope("false", "working", READ("a.txt")),
    envelope("true", "Done"),
  ], { limits: { maxBytesPerTurn: 8 }, prefix: "budget-turn" });
  await fs.writeFile(path.join(root, "a.txt"), "alpha");

  await assert.rejects(runtime.run(), (error) => {
    assert.equal(error.code, "TURN_BUDGET_EXCEEDED");
    assert.ok(
      error.details.bytesUsed > error.details.limit,
      "the rejection must report the size that broke the budget",
    );
    return true;
  });
  // The turn died on its own budget, not on the provider or the tool.
  assert.equal(events.filter((event) => event.type === "tool.completed").length, 1);
});

test("the byte budget restarts at every turn rather than accumulating for the run", async (t) => {
  const long = "y".repeat(100);
  const { runtime } = await harness(t, [
    envelope("false", long),
    envelope("true", long),
  ], { limits: { maxBytesPerTurn: 150 }, prefix: "budget-reset" });

  // 200 bytes across the run, but only 100 within either turn.
  assert.equal((await runtime.run()).message, long);
});

test("recovery retries wait out an exponential backoff with jitter", async (t) => {
  const { runtime, adapter, events } = await harness(t, [
    emptyTurn(),
    emptyTurn(),
    envelope("true", "Recovered"),
  ], {
    registry: new ToolRegistry(),
    limits: {
      retryBackoffBaseMs: 100,
      retryBackoffMaxMs: 1000,
      retryJitterMs: 20,
    },
    random: () => 0.5,
    prefix: "budget-backoff",
  });

  assert.equal((await runtime.run()).message, "Recovered");
  // 100 and 200 base, plus a fixed 10-byte jitter draw.
  assert.deepEqual(backoffs(events), [
    { kind: "empty_response", attempt: 1, maxRetryAttempts: 3, delayMs: 110 },
    { kind: "empty_response", attempt: 2, maxRetryAttempts: 3, delayMs: 210 },
  ]);
  assert.equal(adapter.sentMessages.length, 3);
});

test("the ceiling bounds the backoff even when growth and jitter exceed it", async (t) => {
  const { runtime, events } = await harness(t, [
    emptyTurn(),
    emptyTurn(),
    envelope("true", "Recovered"),
  ], {
    registry: new ToolRegistry(),
    limits: {
      retryBackoffBaseMs: 20,
      retryBackoffMaxMs: 30,
      retryJitterMs: 40,
    },
    random: () => 1,
    prefix: "budget-clamp",
  });

  await runtime.run();
  assert.deepEqual(backoffs(events).map((payload) => payload.delayMs), [30, 30]);
});

test("a dead request and a generation failure report their own backoff kind", async (t) => {
  const { runtime, events } = await harness(t, [
    new BrowserAdapterError("no reply at all", { code: "DEAD_ASSISTANT_REQUEST" }),
    new BrowserAdapterError("server failed", { code: "GENERATION_FAILED" }),
    envelope("true", "Recovered"),
  ], { registry: new ToolRegistry(), prefix: "budget-kinds" });

  await runtime.run();
  assert.deepEqual(backoffs(events).map((payload) => payload.kind), [
    "dead_request",
    "generation_failed",
  ]);
});

test("protocol corrections are retried under the same backoff policy", async (t) => {
  const { runtime, events } = await harness(t, [
    invalidEnvelope,
    envelope("true", "Done"),
  ], { limits: { maxProtocolErrors: 3 }, prefix: "budget-protocol" });

  assert.equal((await runtime.run()).message, "Done");
  assert.deepEqual(backoffs(events), [
    { kind: "protocol_correction", attempt: 1, maxRetryAttempts: 3, delayMs: 0 },
  ]);
});

test("a turn stops retrying once its retry budget is spent", async (t) => {
  const { runtime, events } = await harness(t, [
    emptyTurn(),
    emptyTurn(),
    emptyTurn(),
    emptyTurn(),
  ], {
    registry: new ToolRegistry(),
    // The per-kind budget is deliberately looser so the turn-wide fuse is what
    // ends the run.
    limits: { maxEmptyAssistantRetries: 10, maxRetryAttempts: 2 },
    prefix: "budget-retry-cap",
  });

  await assert.rejects(runtime.run(), (error) => {
    assert.equal(error.code, "RETRY_LIMIT_EXCEEDED");
    assert.equal(error.recoverable, false);
    assert.deepEqual(error.details, {
      kind: "empty_response",
      attempts: 2,
      maxRetryAttempts: 2,
    });
    return true;
  });
  assert.equal(backoffs(events).length, 2);
});

test("a usage limit ends the run without spending any retry budget", async (t) => {
  const { runtime, adapter, events } = await harness(t, [
    new BrowserAdapterError("You've reached your usage limit.", {
      code: "USAGE_LIMIT_REACHED",
    }),
  ], { registry: new ToolRegistry(), prefix: "budget-quota" });

  await assert.rejects(runtime.run(), { code: "USAGE_LIMIT_REACHED" });
  assert.equal(backoffs(events).length, 0);
  assert.equal(events.filter((event) => event.type === "model.limit_reached").length, 1);
  // Quota protection means no continuation message is ever queued behind it.
  assert.equal(adapter.sentMessages.length, 1);
});
