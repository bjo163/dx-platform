import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AgentSession } from "@wtagent/session";
import type { CanonicalTranscriptItem, CanonicalTranscript } from "@wtagent/types";

// ── Types ────────────────────────────────────────────────────────

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobRecord {
  jobId: string;
  task: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface JobCreateOptions {
  task: string;
  metadata?: Record<string, unknown>;
}

export interface JobStatusResponse {
  jobId: string;
  task: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: {
    turn: number;
    phase: string;
    runCount: number;
  };
  result?: any;
}

export interface JobLogsResponse {
  jobId: string;
  transcript: CanonicalTranscriptItem[];
  stdout: string;
  stderr: string;
  events: any[];
}

// ── Job Service ──────────────────────────────────────────────────

export class JobService {
  private baseDir: string;
  private jobsDir: string;
  private sessionsDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.jobsDir = path.join(baseDir, "jobs");
    this.sessionsDir = path.join(baseDir, "sessions");
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.jobsDir, { recursive: true });
    await fs.mkdir(this.sessionsDir, { recursive: true });
  }

  async createJob(options: JobCreateOptions): Promise<JobRecord> {
    const jobId = randomUUID();
    const now = new Date().toISOString();
    
    // Create session for this job
    const session = await AgentSession.create({
      sessionsDir: this.sessionsDir,
      tasksDir: path.join(this.sessionsDir, "tasks"),
      task: options.task,
      projectRoot: this.baseDir, // use base dir as project root
      mode: "agent",
      provider: "chatgpt",
    });
    
    const job: JobRecord = {
      jobId,
      task: options.task,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      sessionId: session.sessionId,
      metadata: options.metadata,
    };
    
    // Save job record
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    await fs.writeFile(jobPath, JSON.stringify(job, null, 2));
    
    return job;
  }

  async getJob(jobId: string): Promise<JobRecord | null> {
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    try {
      const data = await fs.readFile(jobPath, "utf8");
      return JSON.parse(data) as JobRecord;
    } catch (err) {
      if ((err as any).code === "ENOENT") return null;
      throw err;
    }
  }

  async listJobs(): Promise<JobRecord[]> {
    try {
      const files = await fs.readdir(this.jobsDir);
      const jobs: JobRecord[] = [];
      
      for (const file of files) {
        if (file.endsWith(".json")) {
          const job = await this.getJob(file.replace(".json", ""));
          if (job) jobs.push(job);
        }
      }
      
      return jobs;
    } catch (err) {
      if ((err as any).code === "ENOENT") return [];
      throw err;
    }
  }

  async updateJobStatus(jobId: string, status: JobStatus, updates: Partial<JobRecord> = {}): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    job.status = status;
    job.updatedAt = new Date().toISOString();
    
    if (status === "running" && !job.startedAt) {
      job.startedAt = job.updatedAt;
    }
    
    if (status === "completed" || status === "failed" || status === "cancelled") {
      job.completedAt = job.updatedAt;
    }
    
    Object.assign(job, updates);
    
    const jobPath = path.join(this.jobsDir, `${jobId}.json`);
    await fs.writeFile(jobPath, JSON.stringify(job, null, 2));
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;
    
    const session = await AgentSession.load({
      sessionsDir: this.sessionsDir,
      tasksDir: path.join(this.sessionsDir, "tasks"),
      sessionId: job.sessionId,
      taskId: job.jobId,
    });
    
    const progress = {
      turn: session.state.turn,
      phase: session.state.phase,
      runCount: session.state.runCount,
    };
    
    return {
      jobId: job.jobId,
      task: job.task,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      progress,
    };
  }

  async getJobLogs(jobId: string): Promise<JobLogsResponse | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;
    
    const session = await AgentSession.load({
      sessionsDir: this.sessionsDir,
      tasksDir: path.join(this.sessionsDir, "tasks"),
      sessionId: job.sessionId,
      taskId: job.jobId,
    });
    
    const transcript = await session.readTranscript();
    
    // Get events
    const eventsPath = path.join(session.directory, "events.jsonl");
    let events: any[] = [];
    try {
      const raw = await fs.readFile(eventsPath, "utf8");
      events = raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    } catch (err) {
      if ((err as any).code !== "ENOENT") throw err;
    }
    
    // Get tool output
    const toolOutputPath = path.join(session.directory, "tool-output.jsonl");
    let stdout = "";
    let stderr = "";
    try {
      const raw = await fs.readFile(toolOutputPath, "utf8");
      for (const line of raw.split(/\r?\n/).filter(Boolean)) {
        const record = JSON.parse(line);
        if (record.ok) {
          stdout += record.stdout ?? "";
        } else {
          stderr += record.stderr ?? "";
        }
      }
    } catch (err) {
      if ((err as any).code !== "ENOENT") throw err;
    }
    
    return {
      jobId: job.jobId,
      transcript: transcript.items,
      stdout,
      stderr,
      events,
    };
  }

  async diffJobs(jobId1: string, jobId2: string): Promise<any> {
    const job1 = await this.getJob(jobId1);
    const job2 = await this.getJob(jobId2);
    
    if (!job1 || !job2) throw new Error("One or both jobs not found");
    
    // Compare transcript items
    const logs1 = await this.getJobLogs(jobId1);
    const logs2 = await this.getJobLogs(jobId2);
    
    if (!logs1 || !logs2) throw new Error("Failed to load logs for one or both jobs");
    
    const diff = {
      job1: jobId1,
      job2: jobId2,
      status: {
        job1: job1.status,
        job2: job2.status,
      },
      transcriptLength: {
        job1: logs1.transcript.length,
        job2: logs2.transcript.length,
      },
      stdoutLength: {
        job1: logs1.stdout.length,
        job2: logs2.stdout.length,
      },
      stderrLength: {
        job1: logs1.stderr.length,
        job2: logs2.stderr.length,
      },
    };
    
    return diff;
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    await this.updateJobStatus(jobId, "cancelled");
  }
}

export function createJobService(baseDir: string): JobService {
  return new JobService(baseDir);
}