import { AgentSession } from "@dx-platform/session";
import { BrowserAdapterError } from "@dx-platform/shared";
import { createHeadlessRuntime, type HeadlessRuntime } from "./headless-runtime.js";
import type { JobRecord, JobStoreBackend } from "./job-store.js";

export interface JobRunnerOptions {
  store: JobStoreBackend;
  sessionsDir: string;
  owner?: string;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  leaseStaleAfterMs?: number;
  executionTimeoutMs?: number;
  // Injected so the runner can be tested without launching Chrome.
  loadSession?: (record: JobRecord) => Promise<any>;
  buildRuntime?: (config: Parameters<typeof createHeadlessRuntime>[0]) => HeadlessRuntime;
  onEvent?: (record: JobRecord, event: any) => unknown;
}

export const DEFAULT_JOB_EXECUTION_TIMEOUT_MS = 30 * 60 * 1_000;

interface LiveJob {
  adapter: any;
  heartbeat: NodeJS.Timeout;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// One job at a time: every provider shares a single Chrome profile, and the
// profile lock is exclusive, so a pool would only produce failed launches.
export class JobRunner {
  readonly #store: JobStoreBackend;
  readonly #sessionsDir: string;
  readonly #owner: string;
  readonly #pollIntervalMs: number;
  readonly #heartbeatIntervalMs: number;
  readonly #leaseStaleAfterMs: number;
  readonly #executionTimeoutMs: number;
  readonly #loadSession: (record: JobRecord) => Promise<any>;
  readonly #buildRuntime: (config: Parameters<typeof createHeadlessRuntime>[0]) => HeadlessRuntime;
  readonly #onEvent?: (record: JobRecord, event: any) => unknown;
  #running = false;
  #loopPromise: Promise<void> | null = null;
  #live = new Map<string, LiveJob>();

  constructor(options: JobRunnerOptions) {
    this.#store = options.store;
    this.#sessionsDir = options.sessionsDir;
    this.#owner = options.owner ?? `${process.pid}:${Math.random().toString(36).slice(2)}`;
    this.#pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.#heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15_000;
    this.#leaseStaleAfterMs = options.leaseStaleAfterMs ?? 120_000;
    this.#executionTimeoutMs = options.executionTimeoutMs ?? DEFAULT_JOB_EXECUTION_TIMEOUT_MS;
    if (
      !Number.isSafeInteger(this.#executionTimeoutMs)
      || this.#executionTimeoutMs < 1
      || this.#executionTimeoutMs > 2_147_483_647
    ) {
      throw new RangeError("Job execution timeout must be a positive integer no greater than 2147483647 ms.");
    }
    this.#loadSession = options.loadSession ?? ((record) => AgentSession.load({
      sessionsDir: this.#sessionsDir,
      sessionId: record.sessionId,
    }));
    this.#buildRuntime = options.buildRuntime ?? createHeadlessRuntime;
    this.#onEvent = options.onEvent;
  }

  get owner(): string {
    return this.#owner;
  }

  get activeJobIds(): string[] {
    return [...this.#live.keys()];
  }

  start(): Promise<void> {
    if (this.#loopPromise) return Promise.resolve();
    this.#running = true;
    this.#loopPromise = this.#loop().finally(() => {
      this.#loopPromise = null;
    });
    return Promise.resolve();
  }

  async stop(): Promise<void> {
    this.#running = false;
    const loop = this.#loopPromise;
    if (loop) await loop;
  }

  async #loop(): Promise<void> {
    while (this.#running) {
      const record = await this.#store.claimNext(this.#owner, {
        leaseStaleAfterMs: this.#leaseStaleAfterMs,
      });
      if (!record) {
        await delay(this.#pollIntervalMs);
        continue;
      }
      // A cancel requested before the previous holder died survives the reclaim,
      // so the new holder honours it instead of running the turn again.
      if (record.cancelRequested) {
        await this.#store.finalize(record.jobId, this.#owner, "cancelled", {
          error: { code: "JOB_CANCELLED", message: "Cancelled while the previous holder was running it." },
        });
        continue;
      }
      await this.#execute(record);
    }
  }

  async #execute(record: JobRecord): Promise<void> {
    let built: HeadlessRuntime | null = null;
    let timedOut = false;
    let executionTimeout: NodeJS.Timeout | null = null;
    const live: LiveJob = { adapter: null, heartbeat: null as any };
    live.heartbeat = setInterval(() => {
      void this.#renewLease(record, live);
    }, this.#heartbeatIntervalMs);
    live.heartbeat.unref?.();
    this.#live.set(record.jobId, live);
    try {
      const session = await this.#loadSession(record);
      built = this.#buildRuntime({
        session,
        record,
        onEvent: this.#onEvent
          ? (event: any) => this.#onEvent?.(record, event)
          : undefined,
      });
      live.adapter = built.adapter;

      await built.adapter.launch(null, { preferredTargetId: null });
      if (await built.adapter.getAuthState() !== "authenticated") {
        throw new BrowserAdapterError(
          `No authenticated ${record.provider} session for job ${record.jobId}. `
            + "Run `neuralforge login` before submitting jobs.",
          { code: "PROVIDER_NOT_AUTHENTICATED", recoverable: false },
        );
      }

      executionTimeout = setTimeout(() => {
        timedOut = true;
        if (live.adapter) live.adapter.escCancelRequested = true;
      }, this.#executionTimeoutMs);
      executionTimeout.unref?.();
      const result = await built.runtime.run();
      if (timedOut) {
        throw new Error("Job execution timed out.");
      }
      await this.#finish(record.jobId, "completed", { result: { message: result?.message ?? "" } });
    } catch (error: any) {
      const failure = timedOut
        ? {
          code: "JOB_TIMEOUT",
          message: `Job exceeded its ${this.#executionTimeoutMs} ms execution timeout.`,
        }
        : {
          code: typeof error?.code === "string" ? error.code : "JOB_EXECUTION_FAILED",
          message: error?.message ?? String(error),
        };
      await this.#finish(record.jobId, "failed", {
        error: failure,
      });
    } finally {
      if (executionTimeout) clearTimeout(executionTimeout);
      clearInterval(live.heartbeat);
      this.#live.delete(record.jobId);
      await built?.adapter?.close?.().catch?.(() => undefined);
    }
  }

  async #renewLease(record: JobRecord, live: LiveJob): Promise<void> {
    try {
      const renewed = await this.#store.renewLease(record.jobId, this.#owner);
      if (renewed?.lease?.owner === this.#owner) return;
      console.warn(`Job ${record.jobId} lost its execution lease. Interrupting the current run.`);
      if (live.adapter) live.adapter.escCancelRequested = true;
    } catch (error) {
      console.error(`Could not renew the execution lease for job ${record.jobId}. Interrupting the current run.`, error);
      if (live.adapter) live.adapter.escCancelRequested = true;
    }
  }

  // A cancelled run is reported as cancelled, not failed, even though the
  // adapter interrupts the turn by throwing. And a run whose lease has already
  // moved on is left alone: two processes writing one job record is worse than
  // one that never settles.
  async #finish(jobId: string, status: "completed" | "failed", outcome: {
    result?: JobRecord["result"];
    error?: JobRecord["error"];
  }): Promise<void> {
    const current = await this.#store.read(jobId);
    if (!current || current.lease?.owner !== this.#owner) return;
    if (current.cancelRequested) {
      await this.#store.finalize(jobId, this.#owner, "cancelled", {
        error: { code: "JOB_CANCELLED", message: "Cancelled while running." },
      });
      return;
    }
    await this.#store.finalize(jobId, this.#owner, status, outcome);
  }

  // Signals the in-flight adapter immediately instead of waiting for the next
  // lease poll, so a cancel does not have to outlast the current model turn.
  async cancel(jobId: string): Promise<JobRecord | null> {
    const record = await this.#store.requestCancel(jobId);
    const live = this.#live.get(jobId);
    if (live?.adapter) live.adapter.escCancelRequested = true;
    return record;
  }
}
