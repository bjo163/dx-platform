import path from "node:path";
import fs from "node:fs/promises";
import { replaceFileAtomic } from "@neuralforge/shared/atomic-write";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

const JOB_TERMINAL_STATUSES: readonly JobStatus[] = ["completed", "failed", "cancelled"];
const PENDING_STATUSES: readonly JobStatus[] = ["pending", "running"];

// Job ids come from a URL path segment, so they are validated before being
// joined onto the store directory: `../../x` must not resolve outside the store.
const JOB_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidJobId(jobId: unknown): jobId is string {
  return typeof jobId === "string" && JOB_ID_PATTERN.test(jobId);
}

export function assertValidJobId(jobId: unknown): string {
  if (!isValidJobId(jobId)) {
    throw new RangeError(`Invalid job id: ${String(jobId)}`);
  }
  return jobId;
}

export interface JobLease {
  owner: string;
  pid: number;
  heartbeatAt: string;
}

export interface JobRecord {
  jobId: string;
  projectId: string;
  task: string;
  status: JobStatus;
  sessionId: string;
  projectRoot: string;
  provider: string;
  // Tools the caller pre-granted. Anything the policy asks a human about and is
  // not listed here is denied, because nobody is watching a background job.
  allowedTools: string[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  attempts: number;
  lease: JobLease | null;
  cancelRequested: boolean;
  result: { message: string } | null;
  error: { code: string; message: string } | null;
}

export interface JobCreateInput {
  jobId: string;
  projectId: string;
  task: string;
  sessionId: string;
  projectRoot: string;
  provider: string;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
}

export interface JobActivityRecord {
  id: string;
  jobId: string;
  kind: string;
  message: string;
  createdAt: string;
}

export interface JobStoreBackend {
  initialize(): Promise<void>;
  create(input: JobCreateInput): Promise<JobRecord>;
  read(jobId: string): Promise<JobRecord | null>;
  update(
    jobId: string,
    mutate: (record: JobRecord) => Partial<JobRecord> | void,
  ): Promise<JobRecord | null>;
  list(): Promise<JobRecord[]>;
  listByProject(projectId: string): Promise<JobRecord[]>;
  listByStatus(...statuses: JobStatus[]): Promise<JobRecord[]>;
  listByProjectAndStatus(projectId: string, ...statuses: JobStatus[]): Promise<JobRecord[]>;
  deleteExpired(cutoff: string): Promise<JobRecord[]>;
  claimNext(
    owner: string,
    options?: { leaseStaleAfterMs?: number; now?: number },
  ): Promise<JobRecord | null>;
  isLeaseStale(job: JobRecord, leaseStaleAfterMs: number, now?: number): boolean;
  renewLease(jobId: string, owner: string): Promise<JobRecord | null>;
  finalize(
    jobId: string,
    owner: string,
    status: JobStatus,
    outcome?: { result?: JobRecord["result"]; error?: JobRecord["error"] },
  ): Promise<JobRecord | null>;
  requestCancel(jobId: string): Promise<JobRecord | null>;
  retry(jobId: string): Promise<JobRecord | null>;
  appendActivity?(jobId: string, kind: string, message: string, createdAt?: string): Promise<void>;
  listActivity?(jobId: string): Promise<JobActivityRecord[]>;
  listAllActivity?(): Promise<JobActivityRecord[]>;
  correctStartedActivity?(jobId: string, createdAt: string): Promise<void>;
  needsLegacyActivityImport?(): Promise<boolean>;
  markLegacyActivityImported?(): Promise<void>;
}

function isTerminal(status: JobStatus): boolean {
  return JOB_TERMINAL_STATUSES.includes(status);
}

export class JobStore implements JobStoreBackend {
  readonly jobsDir: string;
  // Read-modify-write cycles are serialized in-process so two concurrent
  // updates cannot interleave and lose one another's write.
  #queue: Promise<unknown> = Promise.resolve();

  constructor(jobsDir: string) {
    this.jobsDir = jobsDir;
  }

  #serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.#queue.then(operation, operation);
    this.#queue = next.catch(() => undefined);
    return next;
  }

  #path(jobId: string): string {
    return path.join(this.jobsDir, `${assertValidJobId(jobId)}.json`);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.jobsDir, { recursive: true, mode: 0o700 });
  }

  async create(input: JobCreateInput): Promise<JobRecord> {
    const now = new Date().toISOString();
    const record: JobRecord = {
      jobId: assertValidJobId(input.jobId),
      projectId: input.projectId,
      task: input.task,
      status: "pending",
      sessionId: input.sessionId,
      projectRoot: input.projectRoot,
      provider: input.provider,
      allowedTools: [...new Set(input.allowedTools ?? [])],
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      attempts: 0,
      lease: null,
      cancelRequested: false,
      result: null,
      error: null,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    } as JobRecord;
    await this.#write(record);
    return record;
  }

  async read(jobId: string): Promise<JobRecord | null> {
    try {
      return JSON.parse(await fs.readFile(this.#path(jobId), "utf8")) as JobRecord;
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return null;
      throw error;
    }
  }

  async #write(record: JobRecord): Promise<void> {
    const destination = this.#path(record.jobId);
    // Windows rename can fail while an indexer holds the destination, so the
    // write goes through the same atomic helper the session store uses.
    const temporary = `${destination}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
    await replaceFileAtomic(temporary, destination);
  }

  async update(
    jobId: string,
    mutate: (record: JobRecord) => Partial<JobRecord> | void,
  ): Promise<JobRecord | null> {
    return this.#serialize(async () => {
      const record = await this.read(jobId);
      if (!record) return null;
      const patch = mutate(record);
      const next = { ...record, ...patch, updatedAt: new Date().toISOString() };
      await this.#write(next);
      return next;
    });
  }

  async list(): Promise<JobRecord[]> {
    let names: string[];
    try {
      names = await fs.readdir(this.jobsDir);
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return [];
      throw error;
    }
    const jobs: JobRecord[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const job = await this.read(name.slice(0, -".json".length)).catch(() => null);
      if (job) jobs.push(job);
    }
    return jobs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listByProject(projectId: string): Promise<JobRecord[]> {
    const jobs = await this.list();
    return jobs.filter(job => job.projectId === projectId);
  }

  async listByStatus(...statuses: JobStatus[]): Promise<JobRecord[]> {
    const jobs = await this.list();
    return jobs.filter((job) => statuses.includes(job.status));
  }

  async listByProjectAndStatus(projectId: string, ...statuses: JobStatus[]): Promise<JobRecord[]> {
    const jobs = await this.listByProject(projectId);
    return jobs.filter((job) => statuses.includes(job.status));
  }

  async deleteExpired(cutoff: string): Promise<JobRecord[]> {
    const cutoffTime = Date.parse(cutoff);
    if (!Number.isFinite(cutoffTime)) throw new RangeError("Job retention cutoff must be a valid timestamp.");
    return this.#serialize(async () => {
      const expired = (await this.list()).filter(
        (job) => isTerminal(job.status) && Date.parse(job.updatedAt) < cutoffTime,
      );
      for (const job of expired) {
        await fs.unlink(this.#path(job.jobId));
      }
      return expired;
    });
  }

  // Interrupted runs are failed, not replayed, because tools may have already
  // produced side effects before the process stopped.
  async claimNext(
    owner: string,
    { leaseStaleAfterMs = 120_000, now = Date.now() }: {
      leaseStaleAfterMs?: number;
      now?: number;
    } = {},
  ): Promise<JobRecord | null> {
    return this.#serialize(async () => {
      const candidates = await this.listByStatus(...PENDING_STATUSES);
      for (const job of candidates) {
        if (job.status === "running" && !this.isLeaseStale(job, leaseStaleAfterMs, now)) {
          continue;
        }
        if (job.status === "running") {
          const cancelled = job.cancelRequested;
          await this.#write({
            ...job,
            status: cancelled ? "cancelled" : "failed",
            lease: null,
            completedAt: new Date(now).toISOString(),
            result: null,
            error: cancelled
              ? { code: "JOB_CANCELLED", message: "Cancelled while the previous holder was running it." }
              : {
                code: "JOB_INTERRUPTED",
                message: "The previous run stopped before it completed. Review its activity before retrying.",
              },
            updatedAt: new Date(now).toISOString(),
          });
          continue;
        }
        const claimedAt = new Date(now).toISOString();
        const next: JobRecord = {
          ...job,
          status: "running",
          attempts: job.attempts + 1,
          startedAt: job.startedAt ?? claimedAt,
          completedAt: null,
          error: null,
          lease: { owner, pid: process.pid, heartbeatAt: claimedAt },
          updatedAt: claimedAt,
        };
        await this.#write(next);
        return next;
      }
      return null;
    });
  }

  isLeaseStale(job: JobRecord, leaseStaleAfterMs: number, now = Date.now()): boolean {
    if (job.status !== "running") return false;
    if (!job.lease) return true;
    return now - Date.parse(job.lease.heartbeatAt) > leaseStaleAfterMs;
  }

  async renewLease(jobId: string, owner: string): Promise<JobRecord | null> {
    return this.update(jobId, (job) => (
      job.lease && job.lease.owner === owner
        ? { lease: { ...job.lease, heartbeatAt: new Date().toISOString() } }
        : {}
    ));
  }

  // The holder of a live lease is the only process allowed to finish or abort
  // the job; a stale lease means the previous holder died mid-attempt.
  async finalize(
    jobId: string,
    owner: string,
    status: JobStatus,
    outcome: {
      result?: JobRecord["result"];
      error?: JobRecord["error"];
    } = {},
  ): Promise<JobRecord | null> {
    if (!isTerminal(status)) {
      throw new RangeError(`Cannot finalize a job as ${status}.`);
    }
    return this.update(jobId, (job) => {
      if (job.lease?.owner !== owner) return {};
      return {
        status,
        lease: null,
        completedAt: new Date().toISOString(),
        result: outcome.result ?? null,
        error: outcome.error ?? null,
      };
    });
  }

  async requestCancel(jobId: string): Promise<JobRecord | null> {
    return this.update(jobId, (job) => (
      isTerminal(job.status)
        ? {}
        : {
          cancelRequested: true,
          // A job that has not started will never reach a turn boundary, so it
          // is settled here rather than left pending forever.
          ...(job.status === "pending"
            ? {
              status: "cancelled" as JobStatus,
              completedAt: new Date().toISOString(),
              error: { code: "JOB_CANCELLED", message: "Cancelled before the job started." },
            }
            : {}),
        }
    ));
  }

  async retry(jobId: string): Promise<JobRecord | null> {
    return this.#serialize(async () => {
      const current = await this.read(jobId);
      if (!current || !["failed", "cancelled"].includes(current.status)) return current;
      const next: JobRecord = {
        ...current,
        status: "pending",
        startedAt: null,
        completedAt: null,
        attempts: 0,
        lease: null,
        cancelRequested: false,
        result: null,
        error: null,
        updatedAt: new Date().toISOString(),
      };
      await this.#write(next);
      return next;
    });
  }
}
