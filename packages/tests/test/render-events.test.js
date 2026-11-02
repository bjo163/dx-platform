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
