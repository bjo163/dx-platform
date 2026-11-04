import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AgentSession } from "@wtagent/session/agent-session";
import type { CanonicalTranscriptItem } from "@wtagent/types";
import {
  assertValidJobId,
  JobStore,
  type JobActivityRecord,
  type JobCreateInput,
  type JobRecord,
  type JobStatus,
  type JobStoreBackend,
} from "./job-store.js";
import { JobRunner } from "./job-runner.js";
import type { HeadlessRuntime, HeadlessRuntimeConfig } from "./headless-runtime.js";

export type { JobRecord, JobStatus } from "./job-store.js";

export interface JobCreateOptions {
  task: string;
  provider?: string;
  projectRoot?: string;
  projectId?: string;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
}

export interface JobServiceOptions {
  // Tools a job may use when the caller did not name any. A background job has
  // nobody to answer an approval prompt, so the default must be read-only.
  defaultAllowedTools?: string[];
  provider?: string;
  pollIntervalMs?: number;
  executionTimeoutMs?: number;
  buildRuntime?: (config: HeadlessRuntimeConfig) => HeadlessRuntime;
  loadSession?: (record: JobRecord) => Promise<any>;
  store?: JobStoreBackend;
  onEvent?: (record: JobRecord, event: unknown) => unknown;
}

export interface JobProgress {
  turn: number;
  phase: string;
  runCount: number;
}

export interface JobStatusResponse {
  jobId: string;
  task: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  attempts: number;
  allowedTools: string[];
  progress?: JobProgress;
  result?: JobRecord["result"];
  error?: JobRecord["error"];
}

export interface JobLogsResponse {
  jobId: string;
  transcript: CanonicalTranscriptItem[];
  stdout: string;
  stderr: string;
  events: JobEventRecord[];
  toolOutputs: JobToolOutputRecord[];
  activity: JobActivityRecord[];
}

export interface JobEventRecord {
  type: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface JobToolOutputRecord {
  id?: string;
  name?: string;
  timestamp?: string;
  ok?: boolean;
  stdout?: string;
  stderr?: string;
  code?: number | null;
}

async function readJsonLines<T>(file: string): Promise<T[]> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return [];
    throw error;
  }
  const lines: T[] = [];
  const records = raw.split(/\r?\n/);
  for (const [index, line] of records.entries()) {
    if (!line.trim()) continue;
    try {
      lines.push(JSON.parse(line) as T);
    } catch {
      if (index === records.length - 1 && !/[\r\n]$/.test(raw)) continue;
      throw new Error(`Invalid JSON in job log ${file}.`);
    }
  }
  return lines;
}

export class JobService {
  readonly baseDir: string;
  readonly store: JobStoreBackend;
  readonly runner: JobRunner;
  readonly sessionsDir: string;
  readonly #options: JobServiceOptions;

  constructor(baseDir: string, options: JobServiceOptions = {}) {
    this.baseDir = baseDir;
    this.#options = options;
    this.sessionsDir = path.join(baseDir, "sessions");
    this.store = options.store ?? new JobStore(path.join(baseDir, "jobs"));
    this.runner = new JobRunner({
      store: this.store,
      sessionsDir: this.sessionsDir,
      pollIntervalMs: options.pollIntervalMs,
      executionTimeoutMs: options.executionTimeoutMs,
      loadSession: options.loadSession,
      buildRuntime: options.buildRuntime,
      onEvent: async (record, event) => {
        const activityEvent = event as { type?: unknown; payload?: Record<string, unknown> };
        const kind = typeof activityEvent?.type === "string" ? activityEvent.type : "runtime.event";
        const payload = activityEvent?.payload ?? {};
        const details = ["name", "message", "phase", "code", "status"]
          .flatMap((key) => {
            const value = payload[key];
            return typeof value === "string" || typeof value === "number" ? [`${key}: ${value}`] : [];
          });
        await this.store.appendActivity?.(record.jobId, kind, details.join(" · "));
        await options.onEvent?.(record, event);
      },
    });
  }

  async initialize(): Promise<void> {
    await this.store.initialize();
    await fs.mkdir(this.sessionsDir, { recursive: true, mode: 0o700 });
    if (
      this.store.needsLegacyActivityImport
      && this.store.markLegacyActivityImported
      && await this.store.needsLegacyActivityImport()
    ) {
      await this.#importLegacyActivity();
      await this.store.markLegacyActivityImported();
    }
  }

  async #importLegacyActivity(): Promise<void> {
    if (!this.store.appendActivity || !this.store.listActivity) return;
    for (const job of await this.store.list()) {
      const sessionDirectory = path.join(this.sessionsDir, job.sessionId);
      const sessionEvents = await readJsonLines<JobEventRecord>(path.join(sessionDirectory, "events.jsonl"));
      const existingActivity = await this.store.listActivity(job.jobId);
      if (existingActivity.length > 0) {
        const firstRuntimeEvent = sessionEvents
          .filter((event) => event.type !== "session.created")
          .map((event) => event.timestamp)
          .sort()[0];
        if (firstRuntimeEvent) {
          await this.store.correctStartedActivity?.(job.jobId, firstRuntimeEvent);
        }
        continue;
      }
      const entries: JobActivityRecord[] = [{
        id: `${job.jobId}:queued`,
        jobId: job.jobId,
        kind: "job.queued",
        message: "Job queued.",
        createdAt: job.createdAt,
      }];
      const firstRuntimeEvent = sessionEvents
        .filter((event) => event.type !== "session.created")
        .map((event) => event.timestamp)
        .sort()[0];
      const startedAt = [job.startedAt, firstRuntimeEvent].filter((value): value is string => Boolean(value)).sort()[0];
      if (startedAt) {
        entries.push({
          id: `${job.jobId}:running`,
          jobId: job.jobId,
          kind: "job.running",
          message: "Job started.",
          createdAt: startedAt,
        });
      }
      for (const event of sessionEvents) {
        if (event.type === "session.created") continue;
        const payload = event.payload ?? {};
        const details = ["name", "message", "phase", "code", "status"]
          .flatMap((key) => {
            const value = payload[key];
            return typeof value === "string" || typeof value === "number" ? [`${key}: ${value}`] : [];
          });
        entries.push({
          id: `${job.jobId}:${event.timestamp}:${event.type}`,
          jobId: job.jobId,
          kind: event.type,
          message: details.join(" · "),
          createdAt: event.timestamp,
        });
      }
      if (["completed", "failed", "cancelled"].includes(job.status)) {
        entries.push({
          id: `${job.jobId}:finished`,
          jobId: job.jobId,
          kind: `job.${job.status}`,
          message: job.error?.message ?? job.result?.message ?? `Job ${job.status}.`,
          createdAt: job.completedAt ?? job.updatedAt,
        });
      }
      entries.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      for (const entry of entries) {
        await this.store.appendActivity(job.jobId, entry.kind, entry.message, entry.createdAt);
      }
    }
  }

  async createJob(options: JobCreateOptions): Promise<JobRecord> {
    const provider = options.provider ?? this.#options.provider ?? "chatgpt";
    const projectId = options.projectId ?? "default";
    const session = await AgentSession.create({
      sessionsDir: this.sessionsDir,
      task: options.task,
      projectRoot: options.projectRoot ?? this.baseDir,
      mode: "agent",
      provider,
    });
    const input: JobCreateInput = {
      jobId: randomUUID().replaceAll("-", "").slice(0, 32),
      task: options.task,
      projectId: projectId,
      sessionId: session.sessionId,
      projectRoot: session.state.projectRoot,
      provider,
      allowedTools: options.allowedTools ?? this.#options.defaultAllowedTools ?? [],
      metadata: options.metadata,
    };
    return this.store.create(input);
  }

  async getJob(jobId: string): Promise<JobRecord | null> {
    return this.store.read(jobId);
  }

  async listJobs(): Promise<JobRecord[]> {
    return this.store.list();
  }

  async listByProject(projectId: string): Promise<JobRecord[]> {
    return this.store.listByProject(projectId);
  }

  async listByProjectAndStatus(projectId: string, status: JobStatus): Promise<JobRecord[]> {
    return this.store.listByProjectAndStatus(projectId, status);
  }

  async listActivity(): Promise<JobActivityRecord[]> {
    return this.store.listAllActivity?.() ?? [];
  }

  async deleteExpiredJobs(cutoff: string): Promise<JobRecord[]> {
    const cutoffTime = Date.parse(cutoff);
    if (!Number.isFinite(cutoffTime)) throw new RangeError("Job retention cutoff must be a valid timestamp.");
    const expired = await this.store.deleteExpired(cutoff);
    for (const job of expired) {
      const sessionDirectory = path.resolve(this.sessionsDir, job.sessionId);
      const relativePath = path.relative(this.sessionsDir, sessionDirectory);
      if (!relativePath || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
        throw new Error(`Refusing to remove a session directory outside the session store for job ${job.jobId}.`);
      }
      await fs.rm(sessionDirectory, { recursive: true, force: true });
    }
    return expired;
  }

  // The session a job belongs to is recorded at creation; jobId is only a queue
  // key. A job whose session directory was removed still has a reportable
  // record, so progress is best-effort.
  async #loadSession(record: JobRecord): Promise<any | null> {
    try {
      return await AgentSession.load({ sessionsDir: this.sessionsDir, sessionId: record.sessionId });
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return null;
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse | null> {
    const record = await this.store.read(jobId);
    if (!record) return null;
    const response: JobStatusResponse = {
      jobId: record.jobId,
      task: record.task,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      attempts: record.attempts,
      allowedTools: record.allowedTools,
      result: record.result,
      error: record.error,
    };
    const session = await this.#loadSession(record);
    if (session) {
      response.progress = {
        turn: session.state.turn,
        phase: session.state.phase,
        runCount: session.state.runCount,
      };
    }
    return response;
  }

  async getJobLogs(jobId: string): Promise<JobLogsResponse | null> {
    const record = await this.store.read(jobId);
    if (!record) return null;
    const session = await this.#loadSession(record);
    if (!session) {
      return {
        jobId: record.jobId,
        transcript: [],
        stdout: "",
        stderr: "",
        events: [],
        toolOutputs: [],
        activity: await this.store.listActivity?.(jobId) ?? [],
      };
    }
    const transcript = await session.readTranscript();
    const events = await readJsonLines<JobEventRecord>(path.join(session.directory, "events.jsonl"));
    let stdout = "";
    let stderr = "";
    const toolOutputs = await readJsonLines<JobToolOutputRecord>(path.join(session.directory, "tool-output.jsonl"));
    for (const entry of toolOutputs) {
      stdout += entry.stdout ?? "";
      stderr += entry.stderr ?? "";
    }
    return {
      jobId: record.jobId,
      transcript: transcript.items ?? [],
      stdout,
      stderr,
      events,
      toolOutputs,
      activity: await this.store.listActivity?.(jobId) ?? [],
    };
  }

  async cancelJob(jobId: string): Promise<JobRecord | null> {
    return this.runner.cancel(assertValidJobId(jobId));
  }

  async retryJob(jobId: string): Promise<JobRecord | null> {
    const validId = assertValidJobId(jobId);
    return this.store.retry(validId);
  }

  start(): Promise<void> {
    return this.runner.start();
  }

  stop(): Promise<void> {
    return this.runner.stop();
  }
}

export function createJobService(baseDir: string, options: JobServiceOptions = {}): JobService {
  return new JobService(baseDir, options);
}