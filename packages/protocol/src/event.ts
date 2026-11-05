// Event envelope, schema v1. Every event the platform emits — job progress,
// task state changes, tool results — travels in this shape so a consumer can
// persist, replay, and de-duplicate without knowing the payload type.

import { invalid, valid, type ValidationIssue, type ValidationResult } from "@dx-platform/types";

export const EVENT_SCHEMA_VERSION = 1;

// Dot-namespaced and lowercase, e.g. `task.status.changed`, `job.log.appended`.
const EVENT_TYPE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export interface EventEnvelope<TPayload = Record<string, unknown>> {
  /** Globally unique; consumers de-duplicate on this. */
  id: string;
  type: string;
  /** Schema version of the envelope itself, always EVENT_SCHEMA_VERSION for now. */
  version: number;
  /** ISO-8601 time the event happened, assigned by the producer. */
  timestamp: string;
  /** Component that emitted it, e.g. `job-service`, `runtime`. */
  source: string;
  /** Shared across every event produced by one agent turn or job. */
  correlationId: string;
  payload: TPayload;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() !== "" && value.length <= max ? value : null;
}

function utcTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

/** Build a v1 event, stamping the version. Id and timestamp come from the caller. */
export function createEvent<TPayload>(input: {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  correlationId: string;
  payload: TPayload;
}): EventEnvelope<TPayload> {
  return { ...input, version: EVENT_SCHEMA_VERSION };
}

export function validateEvent(raw: unknown): ValidationResult<EventEnvelope> {
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(raw)) {
    return invalid<EventEnvelope>([{ path: "event", message: `expected an object, got ${typeof raw}` }]);
  }

  const id = text(raw.id, 200);
  if (id === null) issues.push({ path: "event.id", message: "expected a non-empty id" });

  const type = text(raw.type, 200);
  if (type === null || !EVENT_TYPE.test(type)) {
    issues.push({ path: "event.type", message: "expected a lowercase dot-namespaced type such as task.status.changed" });
  }

  if (raw.version !== EVENT_SCHEMA_VERSION) {
    issues.push({ path: "event.version", message: `expected version ${EVENT_SCHEMA_VERSION}, got ${JSON.stringify(raw.version)}` });
  }

  const timestamp = utcTimestamp(raw.timestamp);
  if (timestamp === null) issues.push({ path: "event.timestamp", message: "expected a parseable timestamp" });

  const source = text(raw.source, 200);
  if (source === null) issues.push({ path: "event.source", message: "expected a non-empty source" });

  const correlationId = text(raw.correlationId, 200);
  if (correlationId === null) issues.push({ path: "event.correlationId", message: "expected a non-empty correlationId" });

  if (!isPlainObject(raw.payload)) {
    issues.push({ path: "event.payload", message: "expected an object payload" });
  }

  if (issues.length > 0) return invalid<EventEnvelope>(issues);

  return valid<EventEnvelope>({
    id: id as string,
    type: type as string,
    version: raw.version as number,
    timestamp: timestamp as string,
    source: source as string,
    correlationId: correlationId as string,
    payload: raw.payload as Record<string, unknown>,
  });
}
