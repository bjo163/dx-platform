// Job and mission lifecycles. These are deliberately separate enums: a job is
// one unit of runtime work, a mission is the longer goal a user set, and a task
// (see task.ts) is a step inside a mission. UI labels must map onto these
// values rather than defining a parallel vocabulary.

export const JOB_STATUSES = ["pending", "running", "completed", "failed", "cancelled"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TERMINAL_STATUSES = ["completed", "failed", "cancelled"] as const satisfies readonly JobStatus[];

export function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && (JOB_STATUSES as readonly string[]).includes(value);
}

export function isTerminalJobStatus(status: JobStatus): boolean {
  return (JOB_TERMINAL_STATUSES as readonly string[]).includes(status);
}

/** Jobs still reachable by the pool: pending is unscheduled, running is taken. */
export function isLiveJobStatus(status: JobStatus): boolean {
  return status === "pending" || status === "running";
}

export const MISSION_STATUSES = [
  "draft",
  "active",
  "paused",
  "blocked",
  "completed",
  "failed",
  "cancelled",
] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_TERMINAL_STATUSES = ["completed", "failed", "cancelled"] as const satisfies readonly MissionStatus[];

export function isMissionStatus(value: unknown): value is MissionStatus {
  return typeof value === "string" && (MISSION_STATUSES as readonly string[]).includes(value);
}

export function isTerminalMissionStatus(status: MissionStatus): boolean {
  return (MISSION_TERMINAL_STATUSES as readonly string[]).includes(status);
}

// The edge set is explicit so "resume" has a home: it is the paused -> active
// edge, not a status of its own. Anything not listed here is rejected.
const MISSION_EDGES: Record<MissionStatus, readonly MissionStatus[]> = {
  draft: ["active", "cancelled"],
  active: ["paused", "blocked", "completed", "failed", "cancelled"],
  paused: ["active", "blocked", "cancelled"],
  blocked: ["active", "paused", "failed", "cancelled"],
  completed: [],
  failed: ["active"],
  cancelled: [],
};

export function missionStatusTransitions(from: MissionStatus): readonly MissionStatus[] {
  return MISSION_EDGES[from];
}

export function canTransitionMissionStatus(from: MissionStatus, to: MissionStatus): boolean {
  return MISSION_EDGES[from].includes(to);
}
