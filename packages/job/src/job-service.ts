import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AgentSession } from "@wtagent/session/agent-session";
import type { CanonicalTranscriptItem } from "@wtagent/types";
import { assertValidJobId, JobStore, type JobCreateInput, type JobRecord, type JobStatus } from "./job-store.js";
import { JobRunner } from "./job-runner.js";
import type { HeadlessRuntime, HeadlessRuntimeConfig } from "./headless-runtime.js";

export type { JobRecord, JobStatus } from "./job-store.js";

export interface JobCreateOptions {
  task: string;
  provider?: string;
  projectRoot?: string;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
}

export interface JobServiceOptions {
  // Tools a job may use when the caller did not name any. A background job has
  // nobody to answer an approval prompt, so the default must be read-only.
  defaultAllowedTools?: string[];
  provider?: string;
  pollIntervalMs?: number;
  buildRuntime?: (config: HeadlessRuntimeConfig) => HeadlessRuntime;
  loadSession?: (record: JobRecord) => Promise<any>;
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
  events: any[];
}

async function readJsonLines(file: string): Promise<any[]> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return [];
    throw error;
  }
  const lines: any[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      lines.push(JSON.parse(line));
    } catch {
      // A tail writer can leave a partial line behind after a crash; the rest of
      // the log is still worth returning.
    }
  }
  return lines;
}

export class JobService {
  readonly baseDir: string;
  readonly store: JobStore;
  readonly runner: JobRunner;
  readonly sessionsDir: string;
  readonly #options: JobServiceOptions;

  constructor(baseDir: string, options: JobServiceOptions = {}) {
    this.baseDir = baseDir;
    this.#options = options;
    this.sessionsDir = path.join(baseDir, "sessions");
    this.store = new JobStore(path.join(baseDir, "jobs"));
    this.runner = new JobRunner({
      store: this.store,
      sessionsDir: this.sessionsDir,
      pollIntervalMs: options.pollIntervalMs,
      loadSession: options.loadSession,
      buildRuntime: options.buildRuntime,
    });
  }

  async initialize(): Promise<void> {
    await this.store.initialize();
    await fs.mkdir(this.sessionsDir, { recursive: true, mode: 0o700 });
  }

  async createJob(options: JobCreateOptions): Promise<JobRecord> {
    const provider = options.provider ?? this.#options.provider ?? "chatgpt";
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
      return { jobId: record.jobId, transcript: [], stdout: "", stderr: "", events: [] };
    }
    const transcript = await session.readTranscript().catch(() => ({ items: [] }));
    const events = await readJsonLines(path.join(session.directory, "events.jsonl"));
    let stdout = "";
    let stderr = "";
    for (const entry of await readJsonLines(path.join(session.directory, "tool-output.jsonl"))) {
      if (entry.ok) stdout += entry.stdout ?? "";
      else stderr += entry.stderr ?? "";
    }
    return { jobId: record.jobId, transcript: transcript.items ?? [], stdout, stderr, events };
  }

  async cancelJob(jobId: string): Promise<JobRecord | null> {
    return this.runner.cancel(assertValidJobId(jobId));
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
