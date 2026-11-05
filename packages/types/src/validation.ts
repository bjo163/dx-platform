// Shared result shape for the contract validators in this package. Kept as
// plain data (no exceptions, no schema library) so CLI, API, SDK, and worker
// can all surface the same message to a human.

export interface ValidationIssue {
  /** Dot path into the payload, e.g. `task.dependsOn[0].relation`. */
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T; issues: [] }
  | { ok: false; value: null; issues: ValidationIssue[] };

export function valid<T>(value: T): ValidationResult<T> {
  return { ok: true, value, issues: [] };
}

export function invalid<T>(issues: ValidationIssue[]): ValidationResult<T> {
  return { ok: false, value: null, issues };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

export type IssueSink = ValidationIssue[];

export function requireString(
  sink: IssueSink,
  path: string,
  value: unknown,
  { allowEmpty = false, maxLength = 4096 } = {},
): string | null {
  if (typeof value !== "string") {
    sink.push({ path, message: `expected a string, got ${typeName(value)}` });
    return null;
  }
  if (!allowEmpty && value.trim() === "") {
    sink.push({ path, message: "expected a non-empty string" });
    return null;
  }
  if (value.length > maxLength) {
    sink.push({ path, message: `expected at most ${maxLength} characters, got ${value.length}` });
    return null;
  }
  return value;
}

export function requireTimestamp(sink: IssueSink, path: string, value: unknown): string | null {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) {
    sink.push({ path, message: "expected an ISO-8601 timestamp, e.g. 2026-11-05T03:00:00Z" });
    return null;
  }
  if (Number.isNaN(Date.parse(value))) {
    sink.push({ path, message: "timestamp is not a real date" });
    return null;
  }
  return value;
}

export function requireInt(
  sink: IssueSink,
  path: string,
  value: unknown,
  { min = 0 } = {},
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    sink.push({ path, message: `expected an integer >= ${min}, got ${JSON.stringify(value)}` });
    return null;
  }
  return value;
}

export function requireOneOf<T extends string>(
  sink: IssueSink,
  path: string,
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    sink.push({ path, message: `expected one of ${allowed.join(" | ")}, got ${JSON.stringify(value)}` });
    return null;
  }
  return value as T;
}

export function requireBoolean(sink: IssueSink, path: string, value: unknown): boolean | null {
  if (typeof value !== "boolean") {
    sink.push({ path, message: `expected a boolean, got ${typeName(value)}` });
    return null;
  }
  return value;
}

export function requireStringArray(
  sink: IssueSink,
  path: string,
  value: unknown,
  { allowEmpty = true } = {},
): string[] | null {
  if (!Array.isArray(value)) {
    sink.push({ path, message: `expected an array of strings, got ${typeName(value)}` });
    return null;
  }
  if (!allowEmpty && value.length === 0) {
    sink.push({ path, message: "expected a non-empty array" });
    return null;
  }
  const collected: string[] = [];
  for (const [index, entry] of value.entries()) {
    const item = requireString(sink, `${path}[${index}]`, entry);
    if (item !== null) collected.push(item);
  }
  return collected.length === value.length ? collected : null;
}

export function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
