import { randomUUID } from "node:crypto";
import type { WTagentDatabase } from "@neuralforge/database";
import type {
  JobActivityRecord,
  JobCreateInput,
  JobRecord,
  JobStatus,
  JobStoreBackend,
} from "@neuralforge/job";

type JobRow = { payload: JobRecord | string };
type Queryable = {
  query<T = unknown>(query: string, params?: any[]): Promise<{ rows: T[] }>;
};

const terminalStatuses: readonly JobStatus[] = ["completed", "failed", "cancelled"];

function decodePayload(value: JobRecord | string): JobRecord {
  return typeof value === "string" ? JSON.parse(value) as JobRecord : value;
}

function activityMessage(record: JobRecord): string {
  if (record.error?.message) return record.error.message;
  if (record.result?.message) return record.result.message;
  return `Job ${record.status}.`;
}

export class PGliteJobStore implements JobStoreBackend {
  constructor(private readonly database: WTagentDatabase) {}

  async initialize(): Promise<void> {}

  async importLegacyJobs(records: JobRecord[]): Promise<void> {
    for (const record of records) {
      await this.database.client.query(
        `INSERT INTO jobs(job_id, project_id, task, status, provider, project_root, payload, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(job_id) DO NOTHING`,
        [
          record.jobId,
          record.projectId ?? "default",
          record.task,
          record.status,
          record.provider,
          record.projectRoot,
          JSON.stringify(record),
          record.createdAt,
          record.updatedAt,
        ],
      );
    }
  }

  async needsLegacyActivityImport(): Promise<boolean> {
    const result = await this.database.client.query<{ version: number }>(
      "SELECT version FROM schema_migrations WHERE version = 2",
    );
    return result.rows.length === 0;
  }

  async markLegacyActivityImported(): Promise<void> {
    await this.database.client.query(
      "INSERT INTO schema_migrations(version) VALUES (2) ON CONFLICT(version) DO NOTHING",
    );
  }

  async create(input: JobCreateInput): Promise<JobRecord> {
    const now = new Date().toISOString();
    const record: JobRecord = {
      jobId: input.jobId,
      projectId: input.projectId ?? "default",
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
    };
    await this.database.client.transaction(async (tx) => {
      await this.#write(tx, record);
      await this.#appendActivity(tx, record.jobId, "job.queued", "Job queued.", now);
    });
    return record;
  }

  async read(jobId: string): Promise<JobRecord | null> {
    const result = await this.database.client.query<JobRow>(
      "SELECT payload FROM jobs WHERE job_id = $1",
      [jobId],
    );
    return result.rows[0] ? decodePayload(result.rows[0].payload) : null;
  }

  async update(
    jobId: string,
    mutate: (record: JobRecord) => Partial<JobRecord> | void,
  ): Promise<JobRecord | null> {
    return this.database.client.transaction(async (tx) => {
      const current = await this.#read(tx, jobId, true);
      if (!current) return null;
      const patch = mutate(current);
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
      await this.#write(tx, next);
      if (next.status !== current.status || next.cancelRequested !== current.cancelRequested) {
        await this.#appendActivity(
          tx,
          jobId,
          next.status !== current.status
            ? `job.${next.status}`
            : "job.cancel_requested",
          next.status !== current.status
            ? activityMessage(next)
            : "Cancellation requested.",
          next.updatedAt,
        );
      }
      return next;
    });
  }

  async list(): Promise<JobRecord[]> {
    const result = await this.database.client.query<JobRow>(
      "SELECT payload FROM jobs ORDER BY created_at DESC, job_id",
    );
    return result.rows.map((row) => decodePayload(row.payload));
  }

  async listByProject(projectId: string): Promise<JobRecord[]> {
    const result = await this.database.client.query<JobRow>(
      "SELECT payload FROM jobs WHERE project_id = $1 ORDER BY created_at DESC, job_id",
      [projectId],
    );
    return result.rows.map((row) => decodePayload(row.payload));
  }

  async listByStatus(...statuses: JobStatus[]): Promise<JobRecord[]> {
    if (statuses.length === 0) return [];
    const result = await this.database.client.query<JobRow>(
      "SELECT payload FROM jobs WHERE status = ANY($1::text[]) ORDER BY created_at, job_id",
      [statuses],
    );
    return result.rows.map((row) => decodePayload(row.payload));
  }

  async listByProjectAndStatus(projectId: string, ...statuses: JobStatus[]): Promise<JobRecord[]> {
    if (statuses.length === 0) return [];
    const result = await this.database.client.query<JobRow>(
      "SELECT payload FROM jobs WHERE project_id = $1 AND status = ANY($2::text[]) ORDER BY created_at, job_id",
      [projectId, statuses],
    );
    return result.rows.map((row) => decodePayload(row.payload));
  }

  async deleteExpired(cutoff: string): Promise<JobRecord[]> {
    if (!Number.isFinite(Date.parse(cutoff))) {
      throw new RangeError("Job retention cutoff must be a valid timestamp.");
    }
    return this.database.client.transaction(async (tx) => {
      const result = await tx.query<JobRow>(
        `SELECT payload FROM jobs
         WHERE status = ANY($1::text[]) AND updated_at < $2
         ORDER BY updated_at, job_id
         FOR UPDATE`,
        [terminalStatuses, cutoff],
      );
      const expired = result.rows.map((row) => decodePayload(row.payload));
      for (const job of expired) {
        await tx.query("DELETE FROM activity WHERE job_id = $1", [job.jobId]);
        await tx.query("DELETE FROM jobs WHERE job_id = $1", [job.jobId]);
      }
      return expired;
    });
  }

  isLeaseStale(record: JobRecord, leaseStaleAfterMs: number, now = Date.now()): boolean {
    if (record.status !== "running") return false;
    if (!record.lease) return true;
    return now - Date.parse(record.lease.heartbeatAt) > leaseStaleAfterMs;
  }

  async claimNext(
    owner: string,
    { leaseStaleAfterMs = 120_000, now = Date.now() }: {
      leaseStaleAfterMs?: number;
      now?: number;
    } = {},
  ): Promise<JobRecord | null> {
    return this.database.client.transaction(async (tx) => {
      const result = await tx.query<JobRow>(
        `SELECT payload FROM jobs
         WHERE status IN ('pending', 'running')
         ORDER BY created_at, job_id
         FOR UPDATE SKIP LOCKED`,
      );
      for (const row of result.rows) {
        const job = decodePayload(row.payload);
        if (job.status === "running") {
          if (!this.isLeaseStale(job, leaseStaleAfterMs, now)) continue;
          const interruptedAt = new Date(now).toISOString();
          const failed: JobRecord = {
            ...job,
            status: "failed",
            lease: null,
            completedAt: interruptedAt,
            updatedAt: interruptedAt,
            error: {
              code: "JOB_INTERRUPTED",
              message: "The previous run stopped before it completed. Review its activity before retrying.",
            },
          };
          await this.#write(tx, failed);
          await this.#appendActivity(
            tx,
            job.jobId,
            "job.interrupted",
            failed.error!.message,
            interruptedAt,
          );
          continue;
        }

        const claimedAt = new Date(now).toISOString();
        const claimed: JobRecord = {
          ...job,
          status: "running",
          attempts: job.attempts + 1,
          startedAt: job.startedAt ?? claimedAt,
          completedAt: null,
          error: null,
          lease: { owner, pid: process.pid, heartbeatAt: claimedAt },
          updatedAt: claimedAt,
        };
        await this.#write(tx, claimed);
        await this.#appendActivity(tx, job.jobId, "job.running", "Job started.", claimedAt);
        return claimed;
      }
      return null;
    });
  }

  async renewLease(jobId: string, owner: string): Promise<JobRecord | null> {
    return this.update(jobId, (job) => (
      job.lease?.owner === owner
        ? { lease: { ...job.lease, heartbeatAt: new Date().toISOString() } }
        : {}
    ));
  }

  async finalize(
    jobId: string,
    owner: string,
    status: JobStatus,
    outcome: { result?: JobRecord["result"]; error?: JobRecord["error"] } = {},
  ): Promise<JobRecord | null> {
    if (!terminalStatuses.includes(status)) {
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
      terminalStatuses.includes(job.status)
        ? {}
        : {
          cancelRequested: true,
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
    return this.database.client.transaction(async (tx) => {
      const current = await this.#read(tx, jobId, true);
      if (!current) return null;
      if (!["failed", "cancelled"].includes(current.status)) return current;
      const now = new Date().toISOString();
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
        updatedAt: now,
      };
      await this.#write(tx, next);
      await this.#appendActivity(tx, jobId, "job.pending", "Job retry queued.", now);
      return next;
    });
  }

  async appendActivity(jobId: string, kind: string, message: string, createdAt = new Date().toISOString()): Promise<void> {
    await this.database.client.transaction(async (tx) => {
      await this.#appendActivity(tx, jobId, kind, message, createdAt);
    });
  }

  async listActivity(jobId: string): Promise<JobActivityRecord[]> {
    const result = await this.database.client.query<JobActivityRecord>(
      `SELECT id, job_id AS "jobId", kind, message, created_at AS "createdAt"
       FROM activity WHERE job_id = $1
       ORDER BY created_at,
         CASE kind WHEN 'job.queued' THEN 0 WHEN 'job.running' THEN 1 ELSE 2 END,
         sequence`,
      [jobId],
    );
    return result.rows;
  }

  async listAllActivity(): Promise<JobActivityRecord[]> {
    const result = await this.database.client.query<JobActivityRecord>(
      `SELECT id, job_id AS "jobId", kind, message, created_at AS "createdAt"
       FROM activity ORDER BY created_at DESC, sequence DESC LIMIT 500`,
    );
    return result.rows;
  }

  async correctStartedActivity(jobId: string, createdAt: string): Promise<void> {
    await this.database.client.query(
      `UPDATE activity SET created_at = $2
       WHERE job_id = $1 AND kind = 'job.running' AND created_at > $2`,
      [jobId, createdAt],
    );
  }

  async #read(tx: Queryable, jobId: string, lock = false): Promise<JobRecord | null> {
    const result = await tx.query<JobRow>(
      `SELECT payload FROM jobs WHERE job_id = $1${lock ? " FOR UPDATE" : ""}`,
      [jobId],
    );
    return result.rows[0] ? decodePayload(result.rows[0].payload) : null;
  }

  async #write(tx: Queryable, record: JobRecord): Promise<void> {
    await tx.query(
      `INSERT INTO jobs(job_id, project_id, task, status, provider, project_root, payload, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(job_id) DO UPDATE SET task=EXCLUDED.task, status=EXCLUDED.status,
       provider=EXCLUDED.provider, project_root=EXCLUDED.project_root, payload=EXCLUDED.payload,
       updated_at=EXCLUDED.updated_at`,
      [
        record.jobId,
        record.projectId ?? "default",
        record.task,
        record.status,
        record.provider,
        record.projectRoot,
        JSON.stringify(record),
        record.createdAt,
        record.updatedAt,
      ],
    );
  }

  async #appendActivity(
    tx: Queryable,
    jobId: string,
    kind: string,
    message: string,
    createdAt: string,
  ): Promise<void> {
    await tx.query(
      "INSERT INTO activity(id, job_id, kind, message, created_at) VALUES ($1,$2,$3,$4,$5)",
      [randomUUID(), jobId, kind, message, createdAt],
    );
  }
}
