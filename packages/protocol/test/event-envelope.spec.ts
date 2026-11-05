import { describe, it, expect } from "vitest";
import { createEvent, EVENT_SCHEMA_VERSION, validateEvent } from "../src/event";

const event = () => ({
  id: "evt_01",
  type: "task.status.changed",
  version: EVENT_SCHEMA_VERSION,
  timestamp: "2026-11-05T03:00:00.000Z",
  source: "job-service",
  correlationId: "job_a1b2c3",
  payload: { from: "queued", to: "running" },
});

describe("EventEnvelope schema v1", () => {
  it("stamps the version on a produced event", () => {
    const complete = event();
    const stripped = { ...complete };
    delete stripped.version;
    expect(createEvent(stripped).version).toBe(1);
    expect(createEvent(stripped)).toEqual(complete);
  });

  it("accepts a complete v1 event", () => {
    const result = validateEvent(event());
    expect(result.ok).toBe(true);
    expect(result.value?.correlationId).toBe("job_a1b2c3");
    expect(result.value?.payload).toEqual({ from: "queued", to: "running" });
  });

  it("rejects an event from a schema it cannot interpret", () => {
    const result = validateEvent({ ...event(), version: 2 });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toContain("event.version");
  });

  it("requires every envelope field", () => {
    for (const field of ["id", "type", "timestamp", "source", "correlationId", "payload"]) {
      const payload: Record<string, unknown> = { ...event() };
      delete payload[field];
      const result = validateEvent(payload);
      expect(result.ok, field).toBe(false);
      expect(result.issues.map((issue) => issue.path), field).toContain(`event.${field}`);
    }
  });

  it("demands a dot-namespaced lowercase type", () => {
    expect(validateEvent({ ...event(), type: "TaskStatusChanged" }).ok).toBe(false);
    expect(validateEvent({ ...event(), type: "task" }).ok).toBe(false);
    expect(validateEvent({ ...event(), type: "job.log.appended" }).ok).toBe(true);
  });

  it("rejects a non-object event", () => {
    expect(validateEvent("event").ok).toBe(false);
    expect(validateEvent(null).ok).toBe(false);
  });
});
