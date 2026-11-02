import { AgentSession } from "@wtagent/session/agent-session";
import { BrowserAdapterError } from "@wtagent/shared/errors";
import { createHeadlessRuntime, type HeadlessRuntime } from "./headless-runtime.js";
import type { JobRecord, JobStore } from "./job-store.js";

export interface JobRunnerOptions {
  store: JobStore;
  sessionsDir: string;
  owner?: string;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  leaseStaleAfterMs?: number;
  // Injected so the runner can be tested without launching Chrome.
  loadSession?: (record: JobRecord) => Promise<any>;
  buildRuntime?: (config: Parameters<typeof createHeadlessRuntime>[0]) => HeadlessRuntime;
  onEvent?: (record: JobRecord, event: any) => unknown;
}

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
  readonly #store: JobStore;
  readonly #sessionsDir: string;
  readonly #owner: string;
  readonly #pollIntervalMs: number;
  readonly #heartbeatIntervalMs: number;
  readonly #leaseStaleAfterMs: number;
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
    if (this.#loopPromise) return this.#loopPromise;
    this.#running = true;
    this.#loopPromise = this.#loop().finally(() => {
      this.#loopPromise = null;
    });
    return this.#loopPromise;
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
    const live: LiveJob = { adapter: null, heartbeat: null as any };
    live.heartbeat = setInterval(() => {
      void this.#store.renewLease(record.jobId, this.#owner);
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

      if (await built.adapter.getAuthState() !== "authenticated") {
        throw new BrowserAdapterError(
          `No authenticated ${record.provider} session for job ${record.jobId}. `
            + "Run `wtagent login` before submitting jobs.",
          { code: "PROVIDER_NOT_AUTHENTICATED", recoverable: false },
        );
      }

      const result = await built.runtime.run();
      await this.#finish(record.jobId, "completed", { result: { message: result?.message ?? "" } });
    } catch (error: any) {
      await this.#finish(record.jobId, "failed", {
        error: {
          code: typeof error?.code === "string" ? error.code : "JOB_EXECUTION_FAILED",
          message: error?.message ?? String(error),
        },
      });
    } finally {
      clearInterval(live.heartbeat);
      this.#live.delete(record.jobId);
      await built?.adapter?.close?.().catch?.(() => undefined);
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
