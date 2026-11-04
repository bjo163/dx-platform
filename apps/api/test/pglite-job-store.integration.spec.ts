import { afterEach, describe, expect, it } from "vitest";
import { WTagentDatabase } from "@neuralforge/database";
import type { JobRecord } from "@neuralforge/job";
import { JobRunner, JobService } from "@neuralforge/job";
import { PGliteJobStore } from "../src/pglite-job-store";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("PGlite job store", () => {
  const databases: WTagentDatabase[] = [];
  const directories: string[] = [];

  async function createStore() {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "neuralforge-pglite-jobs-"));
    directories.push(dataDir);
    const database = await WTagentDatabase.open({ dataDir });
    databases.push(database);
    return { store: new PGliteJobStore(database), database, dataDir };
  }

  async function createPending(store: PGliteJobStore, jobId: string): Promise<JobRecord> {
    return store.create({
      jobId,
      task: `Task ${jobId}`,
      sessionId: `session-${jobId}`,
      projectRoot: os.tmpdir(),
      provider: "chatgpt",
    });
  }

  afterEach(async () => {
    await Promise.all(databases.splice(0).map((database) => database.close()));
    await Promise.all(directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
  });

  it("uses PGlite for job records and lifecycle activity", async () => {
    const { store } = await createStore();
    await createPending(store, "job-persist");

    const running = await store.claimNext("worker-a");
    expect(running).toMatchObject({ jobId: "job-persist", status: "running", attempts: 1 });
    await store.appendActivity("job-persist", "model.message_complete", "Provider response received.");
    await store.finalize("job-persist", "worker-a", "completed", { result: { message: "Done" } });

    expect(await store.read("job-persist")).toMatchObject({
      status: "completed",
      result: { message: "Done" },
    });
    expect((await store.listActivity("job-persist")).map((event) => event.kind)).toEqual([
      "job.queued",
      "job.running",
      "model.message_complete",
      "job.completed",
    ]);
  }, 30_000);

  it("does not claim the same pending job twice concurrently", async () => {
    const { store } = await createStore();
    await createPending(store, "job-exclusive");

    const claims = await Promise.all([
      store.claimNext("worker-a"),
      store.claimNext("worker-b"),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await store.read("job-exclusive"))?.attempts).toBe(1);
  }, 30_000);

  it("marks an interrupted run failed and requires an explicit retry", async () => {
    const { store } = await createStore();
    await createPending(store, "job-interrupted");
    const running = await store.claimNext("worker-before-restart");
    expect(running).not.toBeNull();

    const recoveryTime = Date.parse(running!.lease!.heartbeatAt) + 120_001;
    expect(await store.claimNext("worker-after-restart", { now: recoveryTime })).toBeNull();
    expect(await store.read("job-interrupted")).toMatchObject({
      status: "failed",
      lease: null,
      error: { code: "JOB_INTERRUPTED" },
    });

    expect(await store.retry("job-interrupted")).toMatchObject({ status: "pending" });
    expect(await store.claimNext("worker-after-retry", { now: recoveryTime + 1 })).toMatchObject({
      status: "running",
      attempts: 1,
      lease: { owner: "worker-after-retry" },
    });
  }, 30_000);

  it("imports legacy JSON job records without overwriting canonical PGlite state", async () => {
    const { store } = await createStore();
    const legacy: JobRecord = {
      jobId: "job-legacy",
      task: "Imported job",
      status: "failed",
      sessionId: "session-legacy",
      projectRoot: os.tmpdir(),
      provider: "chatgpt",
      allowedTools: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: new Date().toISOString(),
      attempts: 1,
      lease: null,
      cancelRequested: false,
      result: null,
      error: { code: "OLD_FAILURE", message: "Prior attempt" },
    };
    await store.importLegacyJobs([legacy]);
    expect(await store.read("job-legacy")).toMatchObject({ status: "failed" });

    const nextLegacy = { ...legacy, task: "Do not replace", status: "pending" as const };
    await store.importLegacyJobs([nextLegacy]);
    expect(await store.read("job-legacy")).toMatchObject({ task: "Imported job", status: "failed" });
  }, 30_000);

  it("keeps job state and activity across a database restart", async () => {
    const { store, database, dataDir } = await createStore();
    await createPending(store, "job-restart");
    const previousActivity = await store.listActivity("job-restart");

    await database.close();
    databases.splice(databases.indexOf(database), 1);
    const restartedDatabase = await WTagentDatabase.open({ dataDir });
    databases.push(restartedDatabase);
    const restartedStore = new PGliteJobStore(restartedDatabase);

    expect(await restartedStore.read("job-restart")).toMatchObject({ status: "pending" });
    expect(await restartedStore.listActivity("job-restart")).toEqual(previousActivity);
  }, 30_000);

  it("removes only expired terminal jobs, their activity, and their session files", async () => {
    const { store, dataDir } = await createStore();
    const makeRecord = (
      jobId: string,
      status: JobRecord["status"],
      updatedAt: string,
    ): JobRecord => ({
      jobId,
      projectId: "default",
      task: `Task ${jobId}`,
      status,
      sessionId: `session-${jobId}`,
      projectRoot: dataDir,
      provider: "chatgpt",
      allowedTools: [],
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt,
      startedAt: null,
      completedAt: status === "running" || status === "pending" ? null : updatedAt,
      attempts: 1,
      lease: status === "running"
        ? { owner: "worker", pid: process.pid, heartbeatAt: updatedAt }
        : null,
      cancelRequested: false,
      result: null,
      error: null,
    });
    const expired = makeRecord("job-expired", "completed", "2020-01-02T00:00:00.000Z");
    const recent = makeRecord("job-recent", "failed", new Date().toISOString());
    const running = makeRecord("job-running", "running", "2020-01-02T00:00:00.000Z");
    await store.importLegacyJobs([expired, recent, running]);
    await store.appendActivity(expired.jobId, "job.completed", "Expired completion.");
    const expiredSessionDir = path.join(dataDir, "sessions", expired.sessionId);
    await fs.mkdir(expiredSessionDir, { recursive: true });

    const service = new JobService(dataDir, { store });
    const removed = await service.deleteExpiredJobs("2021-01-01T00:00:00.000Z");

    expect(removed.map((job) => job.jobId)).toEqual([expired.jobId]);
    expect(await store.read(expired.jobId)).toBeNull();
    expect(await store.listActivity(expired.jobId)).toEqual([]);
    expect(await fs.stat(expiredSessionDir).catch(() => null)).toBeNull();
    expect(await store.read(recent.jobId)).toMatchObject({ status: "failed" });
    expect(await store.read(running.jobId)).toMatchObject({ status: "running" });
  }, 30_000);

  it("backfills existing session events into PGlite activity exactly once", async () => {
    const { store, dataDir } = await createStore();
    const createdAt = "2026-01-01T00:00:00.000Z";
    const completedAt = "2026-01-01T00:00:03.000Z";
    const legacy: JobRecord = {
      jobId: "job-legacy-events",
      task: "Legacy event history",
      status: "completed",
      sessionId: "session-legacy-events",
      projectRoot: dataDir,
      provider: "chatgpt",
      allowedTools: [],
      createdAt,
      updatedAt: completedAt,
      startedAt: "2026-01-01T00:00:03.000Z",
      completedAt,
      attempts: 1,
      lease: null,
      cancelRequested: false,
      result: { message: "Finished" },
      error: null,
    };
    await store.importLegacyJobs([legacy]);
    const sessionDir = path.join(dataDir, "sessions", legacy.sessionId);
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(
      path.join(sessionDir, "events.jsonl"),
      `${JSON.stringify({
        type: "model.message_complete",
        timestamp: "2026-01-01T00:00:02.000Z",
        payload: { message: "Response saved" },
      })}\n`,
    );

    const service = new JobService(dataDir, { store });
    await service.initialize();
    const firstImport = await store.listActivity(legacy.jobId);
    await service.initialize();

    expect(firstImport.map((event) => event.kind)).toEqual([
      "job.queued",
      "job.running",
      "model.message_complete",
      "job.completed",
    ]);
    expect(firstImport[1]?.createdAt).toBe("2026-01-01T00:00:02.000Z");
    expect(await store.listActivity(legacy.jobId)).toEqual(firstImport);
  }, 30_000);

  it("writes runtime callbacks to the same ordered PGlite activity stream", async () => {
    const { store, dataDir } = await createStore();
    const service = new JobService(dataDir, {
      store,
      pollIntervalMs: 2,
      heartbeatIntervalMs: 1_000,
      loadSession: async () => ({}),
      buildRuntime: (config) => ({
        adapter: {
          launch: async () => undefined,
          getAuthState: async () => "authenticated",
          close: async () => undefined,
        },
        runtime: {
          run: async () => {
            await config.onEvent?.({
              type: "model.message_complete",
              timestamp: new Date().toISOString(),
              payload: { message: "Provider response received." },
            });
            return { message: "Done" };
          },
        },
      }) as never,
    });
    await service.initialize();
    await store.create({
      jobId: "job-runtime-event",
      task: "Run event test",
      sessionId: "session-runtime-event",
      projectRoot: dataDir,
      provider: "chatgpt",
    });
    await service.start();

    const deadline = Date.now() + 5_000;
    let status = await service.getJob("job-runtime-event");
    while (status?.status !== "completed" && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      status = await service.getJob("job-runtime-event");
    }
    await service.stop();

    expect(status?.status).toBe("completed");
    expect((await store.listActivity("job-runtime-event")).map((event) => event.kind)).toEqual([
      "job.queued",
      "job.running",
      "model.message_complete",
      "job.completed",
    ]);
  }, 30_000);

  it("interrupts a live runtime when its database lease is lost", async () => {
    const { store, dataDir } = await createStore();
    await createPending(store, "job-lost-lease");
    let adapter: { escCancelRequested: boolean } | null = null;
    const runner = new JobRunner({
      store,
      sessionsDir: path.join(dataDir, "sessions"),
      owner: "worker-original",
      pollIntervalMs: 2,
      heartbeatIntervalMs: 10,
      loadSession: async () => ({}),
      buildRuntime: () => {
        adapter = {
          escCancelRequested: false,
          launch: async () => undefined,
          getAuthState: async () => "authenticated",
          close: async () => undefined,
        } as never;
        const currentAdapter = adapter as { escCancelRequested: boolean };
        return {
          adapter: currentAdapter,
          runtime: {
            run: async () => {
              while (!currentAdapter.escCancelRequested) {
                await new Promise((resolve) => setTimeout(resolve, 2));
              }
              throw new Error("Run interrupted after losing its lease.");
            },
          },
        } as never;
      },
    });
    await runner.start();
    const runningDeadline = Date.now() + 5_000;
    while ((await store.read("job-lost-lease"))?.status !== "running" && Date.now() < runningDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await store.update("job-lost-lease", () => ({
      lease: {
        owner: "worker-replacement",
        pid: process.pid,
        heartbeatAt: new Date().toISOString(),
      },
    }));

    const interruptionDeadline = Date.now() + 5_000;
    while (!adapter?.escCancelRequested && Date.now() < interruptionDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await runner.stop();

    expect(adapter?.escCancelRequested).toBe(true);
    expect(await store.read("job-lost-lease")).toMatchObject({
      status: "running",
      lease: { owner: "worker-replacement" },
    });
  }, 30_000);

  it("stops an execution that exceeds its configured timeout", async () => {
    const { store, dataDir } = await createStore();
    await createPending(store, "job-timeout");
    let adapter: { escCancelRequested: boolean } | null = null;
    const service = new JobService(dataDir, {
      store,
      pollIntervalMs: 2,
      heartbeatIntervalMs: 1_000,
      executionTimeoutMs: 20,
      loadSession: async () => ({}),
      buildRuntime: () => {
        const currentAdapter = {
          escCancelRequested: false,
          launch: async () => undefined,
          getAuthState: async () => "authenticated",
          close: async () => undefined,
        };
        adapter = currentAdapter;
        return {
          adapter: currentAdapter,
          runtime: {
            run: async () => {
              while (!currentAdapter.escCancelRequested) {
                await new Promise((resolve) => setTimeout(resolve, 2));
              }
              throw new Error("Turn interrupted by the execution timeout.");
            },
          },
        } as never;
      },
    });
    await service.initialize();
    await service.start();

    const deadline = Date.now() + 5_000;
    let job = await service.getJob("job-timeout");
    while (job?.status !== "failed" && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      job = await service.getJob("job-timeout");
    }
    await service.stop();

    expect(adapter?.escCancelRequested).toBe(true);
    expect(job).toMatchObject({
      status: "failed",
      error: {
        code: "JOB_TIMEOUT",
        message: "Job exceeded its 20 ms execution timeout.",
      },
    });
    expect((await store.listActivity("job-timeout")).map((event) => event.kind)).toContain("job.failed");
  }, 30_000);

  it("rejects invalid execution timeout values", async () => {
    const { store, dataDir } = await createStore();
    expect(() => new JobRunner({
      store,
      sessionsDir: path.join(dataDir, "sessions"),
      executionTimeoutMs: 0,
    })).toThrow("Job execution timeout must be a positive integer");
  }, 30_000);
});
