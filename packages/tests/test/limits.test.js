import test from "../src/shim.js";
import assert from "node:assert/strict";
import {
  DEFAULT_LIMITS,
  resolveLimits,
} from "@wtagent/shared/limits";

test("model turn timeout defaults to ten minutes", () => {
  assert.equal(DEFAULT_LIMITS.modelTurnTimeoutMs, 10 * 60_000);
  assert.equal(resolveLimits().modelTurnTimeoutMs, 10 * 60_000);
  assert.equal(resolveLimits().modelTurnTimeoutExplicit, undefined);
});

test("empty assistant responses use a ten-second window and three retries", () => {
  assert.equal(DEFAULT_LIMITS.emptyAssistantWindowMs, 10_000);
  assert.equal(DEFAULT_LIMITS.maxEmptyAssistantRetries, 3);
});

test("tool transport limits use the bounded browser-safe defaults", () => {
  assert.equal(DEFAULT_LIMITS.maxFileReadBytes, 16 * 1024);
  assert.equal(DEFAULT_LIMITS.maxToolOutputBytes, 4 * 1024);
  assert.equal(DEFAULT_LIMITS.maxLocalToolLogBytes, 4 * 1024 * 1024);
  assert.equal(DEFAULT_LIMITS.maxBrowserToolResultBytes, 24 * 1024);
});

test("per-turn budgets cap one turn, not one run", () => {
  assert.equal(DEFAULT_LIMITS.maxBytesPerTurn, 256 * 1024);
  assert.equal(DEFAULT_LIMITS.maxAssistantMessageBytes, 64 * 1024);
  // A single tool result already fits the browser cap, so the turn budget must
  // allow several exchanges before it becomes the binding constraint.
  assert.ok(
    DEFAULT_LIMITS.maxBytesPerTurn > 8 * DEFAULT_LIMITS.maxBrowserToolResultBytes,
  );
});

test("retry backoff grows but stays bounded", () => {
  assert.equal(DEFAULT_LIMITS.maxRetryAttempts, 3);
  assert.equal(DEFAULT_LIMITS.retryBackoffBaseMs, 500);
  assert.equal(DEFAULT_LIMITS.retryBackoffMaxMs, 10_000);
  assert.equal(DEFAULT_LIMITS.retryJitterMs, 250);
  assert.ok(DEFAULT_LIMITS.retryJitterMs < DEFAULT_LIMITS.retryBackoffMaxMs);
  // resolveLimits spreads the defaults, so CLI overrides keep the budgets.
  const limits = resolveLimits({ modelTurnTimeoutMs: "720000" });
  assert.equal(limits.maxBytesPerTurn, DEFAULT_LIMITS.maxBytesPerTurn);
  assert.equal(limits.maxRetryAttempts, DEFAULT_LIMITS.maxRetryAttempts);
});

test("model turn timeout accepts a positive integer CLI value", () => {
  const limits = resolveLimits({
    modelTurnTimeoutMs: "720000",
  });

  assert.equal(limits.modelTurnTimeoutMs, 720_000);
  // An explicit CLI value is marked so the runtime uses it as-is.
  assert.equal(limits.modelTurnTimeoutExplicit, true);
  assert.notEqual(limits, DEFAULT_LIMITS);
});

test("model turn timeout rejects invalid values", () => {
  for (const value of ["0", "-1", "1.5", "not-a-number"]) {
    assert.throws(
      () => resolveLimits({ modelTurnTimeoutMs: value }),
      /positive integer number of milliseconds/,
    );
  }
});
