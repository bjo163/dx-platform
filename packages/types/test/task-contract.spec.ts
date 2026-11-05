import { describe, it, expect } from "vitest";
import { validateTask } from "../src/task";
import { makeTaskId } from "../src/ids";

const taskPayload = () => ({
  id: makeTaskId("a1b2c3"),
  title: "Define the task contract",
  summary: "One vocabulary for CLI, API, SDK, UI, and worker.",
  status: "running",
  priority: "p0",
  missionId: "mission_a1b2c3",
  dependsOn: [
    { upstreamTaskId: "task_upstr1", downstreamTaskId: "task_a1b2c3", relation: "blocks" },
  ],
  createdAt: "2026-11-05T03:00:00Z",
  updatedAt: "2026-11-05T03:10:00Z",
  version: 3,
});

describe("Task contract schema", () => {
  it("accepts a valid payload and returns a typed task", () => {
    const result = validateTask(taskPayload());
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.value?.id).toBe("task_a1b2c3");
    expect(result.value?.dependsOn).toHaveLength(1);
    expect(result.value?.version).toBe(3);
  });

  it("defaults the optional fields rather than failing on them", () => {
    const payload = taskPayload();
    delete (payload as Record<string, unknown>).summary;
    delete (payload as Record<string, unknown>).missionId;
    delete (payload as Record<string, unknown>).dependsOn;
    delete (payload as Record<string, unknown>).version;
    const result = validateTask(payload);
    expect(result.ok).toBe(true);
    expect(result.value?.summary).toBe("");
    expect(result.value?.missionId).toBeNull();
    expect(result.value?.dependsOn).toEqual([]);
    expect(result.value?.version).toBeNull();
  });

  it("rejects every invalid payload with the offending path", () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ["a task id from another kind", { ...taskPayload(), id: "job_a1b2c3" }, "task.id"],
      ["an unknown status", { ...taskPayload(), status: "almost-done" }, "task.status"],
      ["an unknown priority", { ...taskPayload(), priority: "urgent" }, "task.priority"],
      ["an empty title", { ...taskPayload(), title: "   " }, "task.title"],
      ["a mission id of the wrong kind", { ...taskPayload(), missionId: "task_a1b2c3" }, "task.missionId"],
      ["a non-numeric version", { ...taskPayload(), version: "3" }, "task.version"],
      ["a timestamp that is not ISO-8601", { ...taskPayload(), updatedAt: "5 Nov" }, "task.updatedAt"],
    ];
    for (const [label, payload, path] of cases) {
      const result = validateTask(payload);
      expect(result.ok, label).toBe(false);
      expect(result.issues.map((issue) => issue.path), label).toContain(path);
    }
  });

  it("rejects a malformed dependency nested inside an otherwise valid task", () => {
    const result = validateTask({
      ...taskPayload(),
      dependsOn: [{ upstreamTaskId: "task_upstr1", downstreamTaskId: "task_a1b2c3", relation: "probably" }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.path).toBe("task.dependsOn[0].relation");
  });

  it("rejects a non-object payload", () => {
    for (const payload of [null, undefined, "task", 7, []]) {
      expect(validateTask(payload).ok).toBe(false);
    }
  });
});
