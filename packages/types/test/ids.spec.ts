import { describe, it, expect } from "vitest";
import {
  idKindOf,
  idValue,
  isAgentRunId,
  isJobId,
  isMissionId,
  isTaskId,
  makeAgentRunId,
  makeId,
  makeJobId,
  makeMissionId,
  makeTaskId,
  parseAgentRunId,
  parseId,
  parseJobId,
  parseMissionId,
  parseTaskId,
} from "../src/ids";

describe("branded ids", () => {
  it("prefixes each kind with its own discriminant", () => {
    expect(makeTaskId("a1b2c3")).toBe("task_a1b2c3");
    expect(makeJobId("a1b2c3")).toBe("job_a1b2c3");
    expect(makeMissionId("a1b2c3")).toBe("mission_a1b2c3");
    expect(makeAgentRunId("a1b2c3")).toBe("run_a1b2c3");
  });

  it("reports which kind an id is", () => {
    expect(idKindOf(makeJobId("a1b2c3"))).toBe("job");
    expect(idKindOf("task_a1b2c3")).toBe("task");
    expect(idKindOf("nope_a1b2c3")).toBeNull();
    expect(idKindOf(undefined)).toBeNull();
  });

  it("rejects a body that is not safe for urls and filenames", () => {
    expect(() => makeId("task", "ab")).toThrow(TypeError);
    expect(() => makeId("task", "has spaces")).toThrow(TypeError);
    expect(() => makeId("task", "slash/es")).toThrow(TypeError);
    expect(makeId("task", "Ab9-_z")).toBe("task_Ab9-_z");
  });

  it("parses only the requested kind", () => {
    const task = makeTaskId("a1b2c3");
    expect(parseTaskId(task)).toBe(task);
    expect(parseJobId(task)).toBeNull();
    expect(parseId("mission", task)).toBeNull();
  });

  it("returns null instead of throwing on untrusted input", () => {
    expect(parseTaskId(null)).toBeNull();
    expect(parseTaskId(42)).toBeNull();
    expect(parseTaskId("task_")).toBeNull();
    expect(parseTaskId("task_toolong".padEnd(200, "x"))).toBeNull();
    expect(parseAgentRunId("run_abc123")).toBe("run_abc123");
  });

  it("guards by kind so a task id is not a job id", () => {
    const task = makeTaskId("a1b2c3");
    expect(isTaskId(task)).toBe(true);
    expect(isJobId(task)).toBe(false);
    expect(isMissionId(task)).toBe(false);
    expect(isAgentRunId(task)).toBe(false);
  });

  it("erases to the plain string on the wire", () => {
    expect(idValue(makeMissionId("a1b2c3"))).toBe("mission_a1b2c3");
    expect(JSON.stringify({ id: makeJobId("a1b2c3") })).toBe('{"id":"job_a1b2c3"}');
  });
});
