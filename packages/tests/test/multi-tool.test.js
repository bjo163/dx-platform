import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentRuntime } from "@neuralforge/runtime/agent-runtime";
import { TaskSession } from "@neuralforge/session/task-session";
import { createDefaultToolRegistry } from "@neuralforge/tools/default-tools";
import { PolicyEngine } from "@neuralforge/policy/policy-engine";
import { FakeWebModelAdapter } from "@neuralforge/browser/fake-web-model-adapter";
import { DEFAULT_LIMITS } from "@neuralforge/shared/limits";
import { parseAgentResponse, serializeToolResults } from "@neuralforge/protocol/xml-protocol";

// The protocol tags are assembled here so this file stays free of literal
// envelopes while still asserting against the exact wire shape.
const open = (name) => "<" + name + ">";
const close = (name) => "</" + name + ">";
const RESULTS_OPEN = "<" + 'tool_results count="2"';
const READ = (name) => open("tool_call name=\"fs.read\"")
  + "<args><path>" + name + "</path></args>" + close("tool_call");
const WRITE = (name, text) => open("tool_call name=\"fs.write\"")
  + "<args><path>" + name + "</path><content><![CDATA[" + text + "]]></content>"
  + "<mode>overwrite</mode></args>" + close("tool_call");
const envelope = (body) => open("agent_response")
  + "<done>false</done><message>working</message>" + body + close("agent_response");
const FINAL = open("agent_response")
  + "<done>true</done><message>Done</message>" + close("agent_response");

async function harness(t, responses, { approval = async () => true, prefix = "multi" } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `neuralforge-${prefix}-`));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const session = await TaskSession.create({
    sessionsDir: path.join(root, "sessions"),
    projectRoot: root,
    task: "batch",
  });
  const adapter = new FakeWebModelAdapter([...responses, "must not be read"]);
  const events = [];
  const runtime = new AgentRuntime({
    session,
    adapter,
    registry: createDefaultToolRegistry(),
    policy: new PolicyEngine(),
    approval,
    onEvent: (event) => events.push(event),
    limits: { ...DEFAULT_LIMITS },
  });
  return { root, session, adapter, events, runtime };
}

test("one turn can request several tools and every result comes back together", async (t) => {
  await fs.writeFile(path.join(os.tmpdir(), "unused.txt"), "");
  const fixture = await harness(t, [
    envelope(READ("a.txt") + READ("b.txt")),
    FINAL,
  ]);
  const { root, adapter, events, runtime } = fixture;
  await fs.writeFile(path.join(root, "a.txt"), "alpha");
  await fs.writeFile(path.join(root, "b.txt"), "beta");

  const result = await runtime.run();
  assert.equal(result.message, "Done");

  // Two model replies only: the batched tool turn and the final answer.
  assert.equal(adapter.responseNumber, 2);
  const outbound = adapter.sentMessages[1];
  assert.ok(outbound.includes(RESULTS_OPEN + ">"), "batched results need one root");
  assert.equal(
    [...outbound.matchAll(new RegExp(close("tool_result"), "g"))].length,
    2,
    "each call must get its own result block",
  );
  assert.match(outbound, /alpha[\s\S]*beta/, "results must keep the requested order");
  assert.deepEqual(
    events.filter((event) => event.type === "tool.result_sent").map((event) => event.payload.name),
    ["fs.read", "fs.read"],
  );
  assert.equal(events.filter((event) => event.type === "tool.started").length, 2);
});

test("batched writes run serially and both land on disk", async (t) => {
  const fixture = await harness(t, [
    envelope(WRITE("one.txt", "1") + WRITE("two.txt", "2") + WRITE("three.txt", "3")),
    FINAL,
  ]);
  const { root, adapter, runtime } = fixture;

  await runtime.run();
  assert.deepEqual(
    await Promise.all(["one.txt", "two.txt", "three.txt"].map(async (name) => fs.readFile(path.join(root, name), "utf8"))),
    ["1", "2", "3"],
  );
  assert.equal(adapter.responseNumber, 2, "three writes must cost one round trip");
  assert.equal(adapter.sentMessages.length, 2);
});

test("an invalid call in a batch does not stop the other tools", async (t) => {
  const fixture = await harness(t, [
    envelope(
      open("tool_call name=\"fs.write\"")
      + "<args><path>no-mode.txt</path></args>" + close("tool_call")
      + WRITE("ok.txt", "fine"),
    ),
    FINAL,
  ]);
  const { root, adapter, events, runtime } = fixture;

  await runtime.run();
  const outbound = adapter.sentMessages[1];
  assert.match(outbound, /status="error"/, "the rejected call must report an error");
  assert.match(outbound, /status="ok"/, "the valid call must still run");
  assert.equal(await fs.readFile(path.join(root, "ok.txt"), "utf8"), "fine");
  assert.equal(events.filter((event) => event.type === "tool.invalid").length, 1);
});

test("a turn may not request more than the batch limit", async () => {
  const calls = Array.from({ length: 9 }, () => READ("a.txt")).join("");
  assert.throws(
    () => parseAgentResponse(envelope(calls)),
    /at most 8 tools/,
  );
});

test("a single result keeps the one-per-turn wire shape", async () => {
  const xml = serializeToolResults([{ name: "fs.read", ok: true, message: "one" }]);
  assert.ok(xml.startsWith("<" + 'tool_result name="fs.read" '), "one result must not be wrapped");
  assert.ok(xml.includes(close("tool_result")));
  const two = serializeToolResults([
    { name: "fs.read", ok: true, message: "one" },
    { name: "fs.read", ok: false, message: "two" },
  ]);
  assert.ok(two.startsWith(RESULTS_OPEN + ">"));
  assert.ok(two.trimEnd().endsWith(close("tool_results")));
});

test("the batch budget shrinks every result instead of dropping one", async () => {
  const wide = "x".repeat(4000);
  const xml = serializeToolResults(
    [
      { name: "fs.read", ok: true, stdout: wide },
      { name: "fs.read", ok: true, stdout: wide },
      { name: "fs.read", ok: true, stdout: wide },
    ],
    { maxBytes: 12_000 },
  );
  assert.ok(Buffer.byteLength(xml, "utf8") <= 12_000);
  assert.equal([...xml.matchAll(new RegExp(close("tool_result"), "g"))].length, 3);
  assert.ok(xml.includes('truncated="true"'));
});
