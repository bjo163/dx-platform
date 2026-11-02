import assert from "node:assert/strict";
import test from "../src/shim.js";

import { Renderer } from "wtagent/render-events";

function captureStream() {
  let output = "";
  return {
    isTTY: false,
    write(chunk) {
      output += String(chunk);
    },
    output() {
      return output;
    },
  };
}

function ttyCaptureStream() {
  const stream = captureStream();
  stream.isTTY = true;
  return stream;
}

const NEVER = Number.MAX_SAFE_INTEGER;

test("prints browser and conversation lifecycle status only once per CLI session", () => {
  const stream = captureStream();
  const renderer = new Renderer({ stream });

  renderer.handle({ type: "browser.started" });
  renderer.handle({
    type: "conversation.started",
    payload: {},
  });
  renderer.handle({ type: "browser.started" });
  renderer.handle({
    type: "conversation.started",
    payload: {},
  });

  const output = stream.output();
  assert.equal(output.match(/Chrome started\./g)?.length, 1);
  assert.equal(output.match(/Conversation ready\./g)?.length, 1);
});

test("keeps non-lifecycle events visible on later turns", () => {
  const stream = captureStream();
  const renderer = new Renderer({ stream, providerLabel: "Gemini" });

  renderer.handle({ type: "browser.started" });
  renderer.handle({ type: "browser.started" });
  renderer.handle({
    type: "model.limit_reached",
    payload: {},
  });

  assert.match(stream.output(), /Gemini usage limit reached/);
});

test("renders bounded empty-response recovery and preserved-session guidance", () => {
  const stream = captureStream();
  const renderer = new Renderer({ stream, providerLabel: "GLM" });

  renderer.handle({
    type: "model.empty_response",
    payload: { retry: 2, maxRetries: 3 },
  });
  renderer.handle({
    type: "run.recovery_required",
    payload: {
      message: "GLM returned empty responses after 3 continuation attempts.",
    },
  });

  assert.match(stream.output(), /empty GLM response; asking it to continue \(2\/3\)/);
  assert.doesNotMatch(stream.output(), /ChatGPT/);
  assert.match(stream.output(), /session and Chrome window remain open/i);
});

test("names the backoff pause so a retry does not look like a hang", () => {
  const stream = captureStream();
  const renderer = new Renderer({ stream });

  renderer.handle({ type: "retry.backoff", payload: { kind: "empty_response", delayMs: 1500 } });
  renderer.handle({ type: "retry.backoff", payload: { kind: "protocol_correction", delayMs: 0 } });

  assert.match(stream.output(), /Retrying in 2s…/);
  assert.equal(stream.output().match(/Retrying in/g)?.length, 1);
});

test("keeps the live status line running while the model reports progress", () => {
  const stream = ttyCaptureStream();
  const renderer = new Renderer({ stream, longWaitMs: NEVER, longWaitRepeatMs: NEVER });

  renderer.handle({ type: "model.message_sent", payload: {} });
  renderer.handle({ type: "model.progress", payload: { turn: 2, message: "checking the build" } });

  assert.ok(renderer.spinner, "a progress line must not silence the wait it describes");
  assert.ok(renderer.timer, "the frame timer must survive a progress line");
  assert.match(stream.output(), /checking the build/);
  renderer.stopSpinner();
});

test("counts the turn and averages the waits that already finished", () => {
  const stream = ttyCaptureStream();
  const renderer = new Renderer({ stream, longWaitMs: NEVER, longWaitRepeatMs: NEVER });

  for (const turn of [1, 2]) {
    renderer.handle({ type: "model.message_sent", payload: {} });
    renderer.handle({ type: "model.message_complete", payload: { turn } });
  }
  renderer.handle({ type: "model.message_sent", payload: {} });
  renderer.handle({ type: "model.progress", payload: { turn: 3, message: "almost there" } });

  assert.match(stream.output(), /turn 3/);
  assert.match(stream.output(), /~\d+s avg/);
  renderer.stopSpinner();
});

test("announces a wait that outlasts the usual one exactly once", () => {
  const stream = ttyCaptureStream();
  const renderer = new Renderer({ stream, longWaitMs: 0, longWaitRepeatMs: NEVER });

  renderer.handle({ type: "model.message_sent", payload: {} });
  renderer.handle({ type: "model.progress", payload: { turn: 4, message: "reading files" } });
  renderer.handle({ type: "tool.output", payload: { chunk: "x" } });

  assert.equal(stream.output().match(/still waiting after/g)?.length, 1);
  renderer.stopSpinner();
});

test("piped output keeps interim prose and never grows a live line", () => {
  const stream = captureStream();
  const renderer = new Renderer({ stream, longWaitMs: 0 });

  renderer.handle({ type: "model.message_sent", payload: {} });
  renderer.handle({ type: "model.progress", payload: { turn: 1, message: "Reading the manifest" } });

  assert.match(stream.output(), /Reading the manifest/);
  assert.doesNotMatch(stream.output(), /still waiting/);
});
