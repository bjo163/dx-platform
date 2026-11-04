import { createHeadlessRuntime, type HeadlessRuntime, type HeadlessRuntimeConfig } from "./headless-runtime.js";
import type { JobRecord, JobStoreBackend, JobStatus } from "./job-store.js";
import { JobRunner } from "./job-runner.js";

export interface PoolOptions {
  store: JobStoreBackend;
  sessionsDir: string;
  owner?: string;
  workers?: number;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  leaseStaleAfterMs?: number;
  executionTimeoutMs?: number;
  resourceQuota?: ResourceQuota;
  onEvent?: (record: JobRecord, event: any) => unknown;
  loadSession?: (record: JobRecord) => Promise<any>;
  buildRuntime?: (config: Parameters<typeof createHeadlessRuntime>[0]) => HeadlessRuntime;
}

export interface ResourceQuota {
  maxCpuCores?: number;
  maxMemoryMb?: number;
  maxConcurrentJobsPerProject?: number;
  maxConcurrentJobsPerProvider?: number;
}

interface ActiveJob {
  record: JobRecord;
  adapter: any;
  heartbeat: NodeJS.Timeout;
  startedAt: number;
  provider: string;
  projectId: string;
}

export class JobPool {
  readonly #store: JobStoreBackend;
  readonly #sessionsDir: string;
  readonly #workerCount: number;
  readonly #pollIntervalMs: number;
  readonly #heartbeatIntervalMs: number;
  readonly #leaseStaleAfterMs: number;
  readonly #executionTimeoutMs: number;
  readonly #quota: Required<ResourceQuota>;
  readonly #owner: string;
  readonly #onEvent?: (record: JobRecord, event: any) => unknown;
  readonly #loadSession?: (record: JobRecord) => Promise<any>;
  readonly #buildRuntime?: (config: Parameters<typeof createHeadlessRuntime>[0]) => HeadlessRuntime;
  #running = false;
  #loopPromise: Promise<void> | null = null;
  #active = new Map<string, ActiveJob>();
  #runners: JobRunner[] = [];

  constructor(options: PoolOptions) {
    this.#store = options.store;
    this.#sessionsDir = options.sessionsDir;
    this.#workerCount = Math.max(1, options.workers ?? 1);
    this.#pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.#heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15_000;
    this.#leaseStaleAfterMs = options.leaseStaleAfterMs ?? 120_000;
    this.#executionTimeoutMs = options.executionTimeoutMs ?? 30 * 60 * 1_000;
    this.#owner = options.owner ?? `${process.pid}:${Math.random().toString(36).slice(2)}`;
    this.#quota = {
      maxCpuCores: options.resourceQuota?.maxCpuCores ?? 4,
      maxMemoryMb: options.resourceQuota?.maxMemoryMb ?? 2048,
      maxConcurrentJobsPerProject: options.resourceQuota?.maxConcurrentJobsPerProject ?? 2,
      maxConcurrentJobsPerProvider: options.resourceQuota?.maxConcurrentJobsPerProvider ?? 2,
    };
    this.#onEvent = options.onEvent;
    this.#loadSession = options.loadSession;
    this.#buildRuntime = options.buildRuntime;
  }

  get activeCount(): number {
    return this.#active.size;
  }

  get workerCount(): number {
    return this.#workerCount;
  }

  get quota(): Required<ResourceQuota> {
    return { ...this.#quota };
  }

  get activeJobIds(): string[] {
    return [...this.#active.keys()];
  }

  start(): Promise<void> {
    if (this.#loopPromise) return Promise.resolve();
    this.#running = true;
    this.#runners = Array.from({ length: this.#workerCount }, (_, index) =>
      new JobRunner({
        store: this.#store,
        sessionsDir: this.#sessionsDir,
        owner: `${this.#owner}:w${index}`,
        pollIntervalMs: this.#pollIntervalMs,
        heartbeatIntervalMs: this.#heartbeatIntervalMs,
        leaseStaleAfterMs: this.#leaseStaleAfterMs,
        executionTimeoutMs: this.#executionTimeoutMs,
        loadSession: this.#loadSession,
        buildRuntime: this.#buildRuntime,
        onEvent: this.#onEvent,
      }),
    );
    for (const runner of this.#runners) runner.start();
    this.#loopPromise = this.#monitor().finally(() => {
      this.#loopPromise = null;
    });
    return Promise.resolve();
  }

  async stop(): Promise<void> {
    this.#running = false;
    const loop = this.#loopPromise;
    if (loop) await loop;
    for (const runner of this.#runners) await runner.stop();
    this.#runners = [];
  }

  canAccept(record: JobRecord): boolean {
    if (this.#active.size >= this.#workerCount) return false;
    const projectJobs = [...this.#active.values()].filter((a) => a.projectId === record.projectId).length;
    if (projectJobs >= this.#quota.maxConcurrentJobsPerProject) return false;
    const providerJobs = [...this.#active.values()].filter((a) => a.provider === record.provider).length;
    if (providerJobs >= this.#quota.maxConcurrentJobsPerProvider) return false;
    return true;
  }

  async #monitor(): Promise<void> {
    while (this.#running) {
      await this.#reapStale();
      await new Promise((resolve) => setTimeout(resolve, this.#pollIntervalMs));
    }
  }

  async #reapStale(): Promise<void> {
    const now = Date.now();
    for (const [jobId, active] of this.#active.entries()) {
      if (now - active.startedAt > this.#executionTimeoutMs) {
        if (active.adapter) active.adapter.escCancelRequested = true;
        this.#active.delete(jobId);
      }
    }
  }
}

export function createJobPool(options: PoolOptions): JobPool {
  return new JobPool(options);
}