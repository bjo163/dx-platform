// Evidence and verification: what was observed, how it was checked, and how
// much of the budget was spent getting there.

import {
  invalid,
  isPlainObject,
  requireInt,
  requireOneOf,
  requireString,
  requireStringArray,
  requireTimestamp,
  valid,
  type IssueSink,
  type ValidationResult,
} from "./validation.js";
import { parseTaskId, type TaskId } from "./ids.js";

export const EVIDENCE_KINDS = [
  "file",
  "diff",
  "command_output",
  "test_report",
  "screenshot",
  "log",
  "url",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  /** Where the evidence lives: a path, a URL, a command, or a run id. */
  locator: string;
  /** `sha256:<64 hex>` of the bytes this item stands for, so a report can be re-checked. */
  digest: string;
  /** When the observation was made, not when the record was written. */
  observedAt: string;
  /** The tool or person that produced the observation, e.g. `pnpm test`, `reviewer:bjo16`. */
  verifier: string;
  taskId: TaskId | null;
}

const DIGEST = /^sha256:[0-9a-f]{64}$/;

export function validateEvidenceItem(raw: unknown): ValidationResult<EvidenceItem> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path: "evidence", message: `expected an object, got ${typeof raw}` }]);
  }
  const id = requireString(issues, "evidence.id", raw.id, { maxLength: 200 });
  const kind = requireOneOf(issues, "evidence.kind", raw.kind, EVIDENCE_KINDS);
  const locator = requireString(issues, "evidence.locator", raw.locator, { maxLength: 2000 });
  const observedAt = requireTimestamp(issues, "evidence.observedAt", raw.observedAt);
  const verifier = requireString(issues, "evidence.verifier", raw.verifier, { maxLength: 200 });

  if (typeof raw.digest !== "string" || !DIGEST.test(raw.digest)) {
    issues.push({ path: "evidence.digest", message: "expected sha256:<64 hex characters>" });
  }
  const digest = typeof raw.digest === "string" ? raw.digest : null;

  let taskId: TaskId | null = null;
  if (raw.taskId !== null && raw.taskId !== undefined) {
    taskId = parseTaskId(raw.taskId);
    if (taskId === null) issues.push({ path: "evidence.taskId", message: "expected a task_<body> id or null" });
  }

  if (id === null || kind === null || locator === null || observedAt === null || verifier === null || digest === null) {
    return invalid(issues);
  }
  if (issues.length > 0) return invalid(issues);
  return valid({ id, kind, locator, digest, observedAt, verifier, taskId });
}

// Four outcomes, and "skipped" must never be readable as a pass: a run that
// checked nothing reports skipped, one that checked and could not decide
// reports inconclusive.
export const VERIFICATION_OUTCOMES = ["passed", "failed", "skipped", "inconclusive"] as const;

export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];

export interface VerificationCheck {
  name: string;
  outcome: VerificationOutcome;
  evidenceIds: string[];
}

export interface VerificationResult {
  /** Aggregate outcome: passed only when every check passed. */
  outcome: VerificationOutcome;
  verifiedAt: string;
  checks: VerificationCheck[];
  summary?: string | null;
}

export function validateVerificationCheck(raw: unknown, path: string): ValidationResult<VerificationCheck> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path, message: `expected an object, got ${typeof raw}` }]);
  }
  const name = requireString(issues, `${path}.name`, raw.name, { maxLength: 300 });
  const outcome = requireOneOf(issues, `${path}.outcome`, raw.outcome, VERIFICATION_OUTCOMES);
  let evidenceIds: string[] = [];
  if (raw.evidenceIds !== undefined && raw.evidenceIds !== null) {
    const parsed = requireStringArray(issues, `${path}.evidenceIds`, raw.evidenceIds);
    if (parsed !== null) evidenceIds = parsed;
  }
  if (name === null || outcome === null) return invalid(issues);
  if (outcome === "passed" && evidenceIds.length === 0) {
    issues.push({ path: `${path}.evidenceIds`, message: "a passed check must point at evidence" });
    return invalid(issues);
  }
  if (issues.length > 0) return invalid(issues);
  return valid({ name, outcome, evidenceIds });
}

export function validateVerificationResult(raw: unknown): ValidationResult<VerificationResult> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path: "verification", message: `expected an object, got ${typeof raw}` }]);
  }
  const outcome = requireOneOf(issues, "verification.outcome", raw.outcome, VERIFICATION_OUTCOMES);
  const verifiedAt = requireTimestamp(issues, "verification.verifiedAt", raw.verifiedAt);

  let checks: VerificationCheck[] = [];
  if (!Array.isArray(raw.checks)) {
    issues.push({ path: "verification.checks", message: "expected an array of checks" });
  } else {
    for (const [index, entry] of raw.checks.entries()) {
      const result = validateVerificationCheck(entry, `verification.checks[${index}]`);
      if (result.ok) checks.push(result.value);
      else issues.push(...result.issues);
    }
  }

  let summary: string | null | undefined = null;
  if (raw.summary !== undefined && raw.summary !== null) {
    summary = requireString(issues, "verification.summary", raw.summary, { allowEmpty: true, maxLength: 2000 });
  }

  if (outcome === null || verifiedAt === null) return invalid(issues);
  if (outcome === "passed" && checks.length === 0) {
    issues.push({ path: "verification.checks", message: "a passed verification must list the checks it ran" });
    return invalid(issues);
  }
  if (issues.length > 0) return invalid(issues);
  return valid({ outcome, verifiedAt, checks, summary });
}

/**
 * Spend limits and the running total. Each dimension names its own unit in the
 * type so a caller cannot put seconds into a field that the runtime reads as
 * milliseconds or dollars into one read as cents.
 */
export interface Budget {
  /** Input plus output tokens. */
  tokens: BudgetDimension;
  /** Wall-clock milliseconds. */
  durationMs: BudgetDimension;
  /** Provider and tool call count. */
  calls: BudgetDimension;
  /** Cost in whole US cents; null limit means the account price is unknown. */
  costUsdCents: BudgetDimension;
}

export interface BudgetDimension {
  spent: number;
  /** Null when the dimension is unmetered. */
  limit: number | null;
}

export const BUDGET_DIMENSIONS = ["tokens", "durationMs", "calls", "costUsdCents"] as const;

export type BudgetDimensionName = (typeof BUDGET_DIMENSIONS)[number];

export const BUDGET_UNITS: Record<BudgetDimensionName, string> = {
  tokens: "tokens",
  durationMs: "milliseconds",
  calls: "count",
  costUsdCents: "usd_cents",
};

export function validateBudget(raw: unknown): ValidationResult<Budget> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path: "budget", message: `expected an object, got ${typeof raw}` }]);
  }
  const budget = {} as Record<BudgetDimensionName, BudgetDimension>;
  for (const dimension of BUDGET_DIMENSIONS) {
    const entry = raw[dimension];
    if (!isPlainObject(entry)) {
      issues.push({ path: `budget.${dimension}`, message: `expected { spent, limit } in ${BUDGET_UNITS[dimension]}` });
      continue;
    }
    const spent = requireInt(issues, `budget.${dimension}.spent`, entry.spent, { min: 0 });
    let limit: number | null = null;
    let limitMissing = false;
    if (entry.limit !== undefined && entry.limit !== null) {
      limit = requireInt(issues, `budget.${dimension}.limit`, entry.limit, { min: 0 });
      limitMissing = limit === null;
    }
    if (spent === null || limitMissing) continue;
    budget[dimension] = { spent, limit };
  }
  if (Object.keys(budget).length !== BUDGET_DIMENSIONS.length) return invalid(issues);
  return valid(budget as Budget);
}

export function isBudgetDimensionExhausted(dimension: BudgetDimension): boolean {
  return dimension.limit !== null && dimension.spent >= dimension.limit;
}

export function exhaustedBudgetDimensions(budget: Budget): BudgetDimensionName[] {
  return BUDGET_DIMENSIONS.filter((name) => isBudgetDimensionExhausted(budget[name]));
}
