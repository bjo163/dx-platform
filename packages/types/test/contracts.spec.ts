import { describe, it, expect } from "vitest";
import {
  validateAgentCapability,
  validateModelCapability,
  validateProviderHealth,
} from "../src/capability";
import {
  BUDGET_UNITS,
  exhaustedBudgetDimensions,
  isBudgetDimensionExhausted,
  validateBudget,
  validateEvidenceItem,
  validateVerificationCheck,
  validateVerificationResult,
  VERIFICATION_OUTCOMES,
} from "../src/evidence";
import { validateTaskDependency, TASK_RELATIONS } from "../src/task";
import { validateToolCall } from "../src/invocation";
import { makeTaskId } from "../src/ids";

const capability = {
  name: "code-editor",
  description: "Reads and edits files inside the selected project.",
  toolNames: ["fs.read", "fs.edit"],
  inputModes: ["text", "image"],
  outputModes: ["text"],
  requiresApproval: true,
  maxConcurrentRuns: 1,
};

describe("AgentCapability contract", () => {
  it("accepts a capability expressed as data", () => {
    const result = validateAgentCapability(capability);
    expect(result.ok).toBe(true);
    expect(result.value?.toolNames).toEqual(["fs.read", "fs.edit"]);
    expect(result.value?.requiresApproval).toBe(true);
  });

  it("rejects an unknown content mode or a negative concurrency", () => {
    expect(validateAgentCapability({ ...capability, inputModes: ["hologram"] }).ok).toBe(false);
    expect(validateAgentCapability({ ...capability, maxConcurrentRuns: -1 }).ok).toBe(false);
    expect(validateAgentCapability({ ...capability, requiresApproval: "yes" }).ok).toBe(false);
    expect(validateAgentCapability("capability").ok).toBe(false);
  });
});

describe("ModelCapability contract", () => {
  const model = {
    provider: "kimi",
    model: "kimi-latest",
    contextWindowTokens: 200000,
    maxOutputTokens: 8192,
    supportsTools: true,
    supportsStructuredOutput: false,
    supportsVision: true,
    supportsStreaming: true,
  };

  it("carries context, tools, structured output, vision, and streaming", () => {
    const result = validateModelCapability(model);
    expect(result.ok).toBe(true);
    expect(result.value?.contextWindowTokens).toBe(200000);
    expect(result.value?.supportsStructuredOutput).toBe(false);
  });

  it("allows an unmetered output cap but requires a positive context window", () => {
    expect(validateModelCapability({ ...model, maxOutputTokens: null }).ok).toBe(true);
    expect(validateModelCapability({ ...model, contextWindowTokens: 0 }).ok).toBe(false);
    expect(validateModelCapability({ ...model, supportsVision: "true" }).ok).toBe(false);
  });
});

describe("ProviderHealth contract", () => {
  it("always carries when the reading was taken", () => {
    const result = validateProviderHealth({
      provider: "chatgpt",
      status: "healthy",
      checkedAt: "2026-11-05T03:00:00Z",
      latencyMs: 420,
    });
    expect(result.ok).toBe(true);
    expect(result.value?.reason ?? null).toBeNull();
  });

  it("demands a reason whenever the provider is not healthy", () => {
    const degraded = { provider: "grok", status: "degraded", checkedAt: "2026-11-05T03:00:00Z", latencyMs: null };
    expect(validateProviderHealth(degraded).ok).toBe(false);
    expect(validateProviderHealth({ ...degraded, reason: "login wall detected" }).ok).toBe(true);
    expect(validateProviderHealth({ ...degraded, status: "nope", reason: "x" }).ok).toBe(false);
    expect(validateProviderHealth({ ...degraded, checkedAt: "yesterday" }).ok).toBe(false);
  });
});

describe("TaskDependency contract", () => {
  it("stores both ids and the relation type", () => {
    const raw = {
      upstreamTaskId: makeTaskId("upstr1"),
      downstreamTaskId: makeTaskId("downstr1"),
      relation: "blocks",
    };
    const result = validateTaskDependency(raw);
    expect(result.ok).toBe(true);
    expect(result.value?.relation).toBe("blocks");
    expect(TASK_RELATIONS).toContain("gates");
  });

  it("rejects a relation or an id it does not recognise", () => {
    const base = { upstreamTaskId: "task_upstr1", downstreamTaskId: "task_downstr1", relation: "blocks" };
    expect(validateTaskDependency({ ...base, relation: "maybe" }).ok).toBe(false);
    expect(validateTaskDependency({ ...base, upstreamTaskId: "job_upstr1" }).ok).toBe(false);
    expect(validateTaskDependency({ relation: "blocks" }).ok).toBe(false);
    expect(validateTaskDependency([]).ok).toBe(false);
  });
});

describe("ToolCall contract", () => {
  const call = {
    callId: "call_1",
    correlationId: "run_9f8e7d",
    name: "fs.write",
    input: { path: "src/a.ts", content: "x" },
    permission: "confirm",
  };

  it("links input, permission, correlation id, and an optional result", () => {
    expect(validateToolCall(call).ok).toBe(true);
    expect(validateToolCall({ ...call, result: { ok: true, message: "wrote 1 file" } }).value?.result?.ok).toBe(true);
  });

  it("rejects a call without a correlation id or with a non-object input", () => {
    expect(validateToolCall({ ...call, correlationId: "" }).ok).toBe(false);
    expect(validateToolCall({ ...call, input: "src/a.ts" }).ok).toBe(false);
    expect(validateToolCall({ ...call, permission: "always" }).ok).toBe(false);
    expect(validateToolCall({ ...call, result: { ok: "true", message: "x" } }).ok).toBe(false);
  });
});

describe("EvidenceItem contract", () => {
  const evidence = {
    id: "ev_1",
    kind: "test_report",
    locator: "packages/types/test/task-contract.spec.ts",
    digest: `sha256:${"0".repeat(64)}`,
    observedAt: "2026-11-05T03:00:00.500Z",
    verifier: "pnpm test",
    taskId: "task_upstr1",
  };

  it("carries kind, locator, digest, timestamp, and verifier", () => {
    const result = validateEvidenceItem(evidence);
    expect(result.ok).toBe(true);
    expect(result.value?.taskId).toBe("task_upstr1");
  });

  it("requires a sha256 digest and a real timestamp", () => {
    expect(validateEvidenceItem({ ...evidence, digest: "md5:abc" }).ok).toBe(false);
    expect(validateEvidenceItem({ ...evidence, observedAt: "05/11/2026" }).ok).toBe(false);
    expect(validateEvidenceItem({ ...evidence, kind: "vibes" }).ok).toBe(false);
    expect(validateEvidenceItem({ ...evidence, taskId: "not-an-id" }).ok).toBe(false);
  });
});

describe("VerificationResult contract", () => {
  it("keeps pass, fail, skipped, and inconclusive distinct", () => {
    expect(VERIFICATION_OUTCOMES).toEqual(["passed", "failed", "skipped", "inconclusive"]);
    const body = (outcome: string, evidenceIds: string[]) => ({
      outcome,
      verifiedAt: "2026-11-05T03:00:00Z",
      checks: [{ name: "unit tests", outcome, evidenceIds }],
    });
    expect(validateVerificationResult(body("passed", ["ev_1"])).ok).toBe(true);
    expect(validateVerificationResult(body("skipped", [])).ok).toBe(true);
    expect(validateVerificationResult(body("inconclusive", [])).ok).toBe(true);
    // A pass with nothing to point at is how a green report lies.
    expect(validateVerificationResult(body("passed", [])).ok).toBe(false);
    expect(validateVerificationResult(body("passed", [])).issues[0]?.path).toBe("verification.checks[0].evidenceIds");
  });

  it("refuses an aggregate pass built from zero checks", () => {
    expect(
      validateVerificationResult({ outcome: "passed", verifiedAt: "2026-11-05T03:00:00Z", checks: [] }).ok,
    ).toBe(false);
    expect(validateVerificationResult("verification").ok).toBe(false);
  });

  it("rejects a check without evidence for a pass", () => {
    expect(validateVerificationCheck({ name: "lint", outcome: "passed", evidenceIds: [] }, "check").ok).toBe(false);
    expect(validateVerificationCheck({ name: "lint", outcome: "passed", evidenceIds: ["ev_2"] }, "check").ok).toBe(true);
  });
});

describe("Budget contract", () => {
  const budget = {
    tokens: { spent: 1200, limit: 100000 },
    durationMs: { spent: 5000, limit: null },
    calls: { spent: 3, limit: 3 },
    costUsdCents: { spent: 41, limit: 500 },
  };

  it("names the unit of every dimension", () => {
    expect(BUDGET_UNITS).toEqual({
      tokens: "tokens",
      durationMs: "milliseconds",
      calls: "count",
      costUsdCents: "usd_cents",
    });
    const result = validateBudget(budget);
    expect(result.ok).toBe(true);
    expect(result.value?.durationMs.limit).toBeNull();
  });

  it("treats a spent total that reaches the limit as exhausted", () => {
    const parsed = validateBudget(budget).value;
    expect(parsed && isBudgetDimensionExhausted(parsed.calls)).toBe(true);
    expect(parsed && exhaustedBudgetDimensions(parsed)).toEqual(["calls"]);
  });

  it("rejects a dimension that is missing or negative", () => {
    expect(validateBudget({ ...budget, calls: undefined }).ok).toBe(false);
    expect(validateBudget({ ...budget, tokens: { spent: -1, limit: 10 } }).ok).toBe(false);
    expect(validateBudget({ ...budget, tokens: { spent: "1200", limit: 10 } }).ok).toBe(false);
  });
});
