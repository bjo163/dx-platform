import { describe, it, expect } from "vitest";
import {
  canTransitionMissionStatus,
  isJobStatus,
  isLiveJobStatus,
  isMissionStatus,
  isTerminalJobStatus,
  isTerminalMissionStatus,
  JOB_STATUSES,
  MISSION_STATUSES,
  missionStatusTransitions,
} from "../src/status";
import {
  compareTaskPriorities,
  isMoreUrgent,
  isTaskPriority,
  isTaskStatus,
  isTerminalTaskStatus,
  TASK_PRIORITIES,
  TASK_STATUSES,
  taskPriorityRank,
} from "../src/task";

describe("canonical status enums", () => {
  it("covers every task state the planner names", () => {
    for (const status of ["queued", "ready", "running", "blocked", "review", "verified", "failed", "cancelled"]) {
      expect(isTaskStatus(status)).toBe(true);
    }
    expect(TASK_STATUSES).toHaveLength(8);
    expect(isTaskStatus("done")).toBe(false);
    expect(isTaskStatus(null)).toBe(false);
  });

  it("marks only finished task states terminal", () => {
    expect(TASK_STATUSES.filter(isTerminalTaskStatus)).toEqual(["verified", "failed", "cancelled"]);
    expect(isTerminalTaskStatus("review")).toBe(false);
    expect(isTerminalTaskStatus("blocked")).toBe(false);
  });

  it("keeps job status independent of the task and mission enums", () => {
    expect(JOB_STATUSES).toEqual(["pending", "running", "completed", "failed", "cancelled"]);
    // "completed" is a job word and "verified" is a task word: they are not
    // interchangeable, which is why jobs do not reuse the task enum.
    expect(JOB_STATUSES).not.toContain("verified");
    expect(TASK_STATUSES).not.toContain("completed");
    expect(MISSION_STATUSES).not.toContain("pending");
    expect(isJobStatus("queued")).toBe(false);
    expect(isMissionStatus("queued")).toBe(false);
  });

  it("separates live jobs from terminal ones", () => {
    expect(JOB_STATUSES.filter(isTerminalJobStatus)).toEqual(["completed", "failed", "cancelled"]);
    expect(JOB_STATUSES.filter(isLiveJobStatus)).toEqual(["pending", "running"]);
  });

  it("represents pause, resume, complete, and fail for missions", () => {
    expect(MISSION_STATUSES).toContain("paused");
    expect(MISSION_STATUSES).toContain("completed");
    expect(MISSION_STATUSES).toContain("failed");
    // Resume is the paused -> active edge, so it is expressible without a
    // "resumed" status that no producer would ever write.
    expect(canTransitionMissionStatus("paused", "active")).toBe(true);
    expect(canTransitionMissionStatus("active", "paused")).toBe(true);
    expect(canTransitionMissionStatus("active", "completed")).toBe(true);
    expect(canTransitionMissionStatus("active", "failed")).toBe(true);
    expect(canTransitionMissionStatus("completed", "active")).toBe(false);
    expect(missionStatusTransitions("cancelled")).toEqual([]);
    expect(isTerminalMissionStatus("blocked")).toBe(false);
    expect(isMissionStatus("resumed")).toBe(false);
  });
});

describe("task priority", () => {
  it("orders by rank, not alphabetically", () => {
    expect([...TASK_PRIORITIES].sort()).not.toEqual([...TASK_PRIORITIES]);
    expect(taskPriorityRank("backlog")).toBeGreaterThan(taskPriorityRank("p0"));
    expect(compareTaskPriorities("p0", "p3")).toBeLessThan(0);
    expect(compareTaskPriorities("p2", "p2")).toBe(0);
    expect(isMoreUrgent("p1", "p0")).toBe(false);
    expect(isMoreUrgent("p0", "p1")).toBe(true);
  });

  it("sorts a queue by urgency", () => {
    const queue = ["backlog", "p2", "p0", "p1"];
    expect(queue.sort(compareTaskPriorities)).toEqual(["p0", "p1", "p2", "backlog"]);
    expect(isTaskPriority("urgent")).toBe(false);
  });
});
