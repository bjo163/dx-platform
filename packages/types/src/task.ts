// The task is the unit the planner, worker, and UI all argue about. These are
// the canonical spellings; anything that stores a task status stores one of
// TASK_STATUSES and nothing else.

import {
  invalid,
  isPlainObject,
  requireInt,
  requireOneOf,
  requireString,
  requireTimestamp,
  valid,
  type IssueSink,
  type ValidationResult,
} from "./validation.js";
import { parseMissionId, parseTaskId, type MissionId, type TaskId } from "./ids.js";

export const TASK_STATUSES = [
  "queued",
  "ready",
  "running",
  "blocked",
  "review",
  "verified",
  "failed",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** A task in one of these states is never picked up again by a worker. */
export const TASK_TERMINAL_STATUSES = ["verified", "failed", "cancelled"] as const satisfies readonly TaskStatus[];

/** States that hold a worker slot: the runtime is inside the task. */
export const TASK_ACTIVE_STATUSES = ["running"] as const satisfies readonly TaskStatus[];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return (TASK_TERMINAL_STATUSES as readonly string[]).includes(status);
}

// Ordered most urgent first. Comparison must use the rank table: sorting these
// strings alphabetically puts "backlog" above "p0", which inverts the queue.
export const TASK_PRIORITIES = ["p0", "p1", "p2", "p3", "backlog"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const TASK_PRIORITY_RANK: Record<TaskPriority, number> = {
  p0: 0,
  p1: 1,
  p2: 2,
  p3: 3,
  backlog: 4,
};

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && (TASK_PRIORITIES as readonly string[]).includes(value);
}

export function taskPriorityRank(priority: TaskPriority): number {
  return TASK_PRIORITY_RANK[priority];
}

/** Ascending urgency: negative when `a` should run before `b`. */
export function compareTaskPriorities(a: TaskPriority, b: TaskPriority): number {
  return TASK_PRIORITY_RANK[a] - TASK_PRIORITY_RANK[b];
}

export function isMoreUrgent(a: TaskPriority, b: TaskPriority): boolean {
  return compareTaskPriorities(a, b) < 0;
}

// "blocks" is hard: the upstream must reach a terminal-success state first.
// "gates" waits for a human decision, not for the upstream task to finish.
// "follows" is an ordering hint only and never holds the task back.
export const TASK_RELATIONS = ["blocks", "gates", "follows"] as const;

export type TaskRelation = (typeof TASK_RELATIONS)[number];

export function isTaskRelation(value: unknown): value is TaskRelation {
  return typeof value === "string" && (TASK_RELATIONS as readonly string[]).includes(value);
}

export interface TaskDependency {
  upstreamTaskId: TaskId;
  downstreamTaskId: TaskId;
  relation: TaskRelation;
}

export interface Task {
  id: TaskId;
  title: string;
  summary: string;
  status: TaskStatus;
  priority: TaskPriority;
  missionId: MissionId | null;
  dependsOn: TaskDependency[];
  createdAt: string;
  updatedAt: string;
  /** Optimistic-lock counter; null when the producer does not track one yet. */
  version: number | null;
}

export function validateTaskDependency(raw: unknown, path = "dependency"): ValidationResult<TaskDependency> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path, message: `expected a dependency object, got ${typeof raw}` }]);
  }
  const upstreamTaskId = parseTaskId(raw.upstreamTaskId);
  if (upstreamTaskId === null) issues.push({ path: `${path}.upstreamTaskId`, message: "expected a task_<body> id" });
  const downstreamTaskId = parseTaskId(raw.downstreamTaskId);
  if (downstreamTaskId === null) {
    issues.push({ path: `${path}.downstreamTaskId`, message: "expected a task_<body> id" });
  }
  const relation = requireOneOf(issues, `${path}.relation`, raw.relation, TASK_RELATIONS);
  if (upstreamTaskId === null || downstreamTaskId === null || relation === null) {
    return invalid(issues);
  }
  return valid({ upstreamTaskId, downstreamTaskId, relation });
}

/** Parse an untrusted payload (HTTP body, JSON file, CLI argument) into a Task. */
export function validateTask(raw: unknown): ValidationResult<Task> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path: "task", message: `expected an object, got ${typeof raw}` }]);
  }

  const id = parseTaskId(raw.id);
  if (id === null) issues.push({ path: "task.id", message: "expected a task_<body> id" });

  const title = requireString(issues, "task.title", raw.title, { maxLength: 500 });
  const summary = raw.summary === undefined ? "" : requireString(issues, "task.summary", raw.summary, { allowEmpty: true, maxLength: 4000 });
  const status = requireOneOf(issues, "task.status", raw.status, TASK_STATUSES);
  const priority = requireOneOf(issues, "task.priority", raw.priority, TASK_PRIORITIES);

  let missionId: MissionId | null = null;
  if (raw.missionId !== null && raw.missionId !== undefined) {
    missionId = parseMissionId(raw.missionId);
    if (missionId === null) issues.push({ path: "task.missionId", message: "expected a mission_<body> id or null" });
  }

  let dependsOn: TaskDependency[] = [];
  if (raw.dependsOn !== undefined && raw.dependsOn !== null) {
    if (!Array.isArray(raw.dependsOn)) {
      issues.push({ path: "task.dependsOn", message: "expected an array of dependencies" });
    } else {
      const parsed: TaskDependency[] = [];
      for (const [index, entry] of raw.dependsOn.entries()) {
        const result = validateTaskDependency(entry, `task.dependsOn[${index}]`);
        if (result.ok) parsed.push(result.value);
        else issues.push(...result.issues);
      }
      dependsOn = parsed;
    }
  }

  const createdAt = requireTimestamp(issues, "task.createdAt", raw.createdAt);
  const updatedAt = requireTimestamp(issues, "task.updatedAt", raw.updatedAt);

  let version: number | null = null;
  if (raw.version !== undefined && raw.version !== null) {
    version = requireInt(issues, "task.version", raw.version, { min: 1 });
  }

  if (
    id === null ||
    title === null ||
    summary === null ||
    status === null ||
    priority === null ||
    createdAt === null ||
    updatedAt === null
  ) {
    return invalid(issues);
  }
  // Optional fields (missionId, dependsOn entries, version) report themselves
  // through the sink instead of narrowing, so any leftover issue is a rejection.
  if (issues.length > 0) return invalid(issues);

  return valid({
    id,
    title,
    summary,
    status,
    priority,
    missionId,
    dependsOn,
    createdAt,
    updatedAt,
    version,
  });
}
