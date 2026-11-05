import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { JobStore, JobRunner, createHeadlessRuntime } from "@neuralforge/job";
import { GatewayServer } from "../../packages/gateway/dist/index.js";
import { TaskSession } from "@neuralforge/session/task-session";
import { useTempDir } from "../src/temp-dir.js";

const HOUR = 3_600_000;

async function tempStore(t, prefix) {
  const root = await useTempDir(t, prefix);
  const store = new JobStore(path.join(root, "jobs"));
  await store.initialize();
  return { root, store };
}

// The runner raises the ESC flag from another task, so an unpolled flag would
// turn a missing cancellation into a test that runs down the suite timeout.
async function waitForCancelFlag(adapter, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!adapter.escCancelRequested && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  if (!adapter.escCancelRequested) {
    throw new Error(`the runner never raised the ESC flag within ${timeoutMs}ms`);
  }
}

const queued = (store, jobId, fields = {}) => store.create({
  jobId,
  task: `task for ${jobId}`,
  sessionId: `session_for_${jobId}`,
  projectRoot: "Z:/scratch",
  provider: "chatgpt",
  allowedTools: ["fs.read"],
  ...fields,
});

test("a job id taken from a URL segment cannot escape the store directory", async (t) => {
  const { root, store } = await tempStore(t, "job");
  for (const bad of ["../escaped", "a/b", "", "x".repeat(65), "dots..json", null, 42]) {
    await assert.rejects(store.read(bad), RangeError, `${String(bad)} must be refused`);
  }
  await assert.rejects(
    queued(store, "../outside"),
    RangeError,
  );
  assert.deepEqual(await fs.readdir(path.join(root, "jobs")), []);
});

test("a settled job leaves no temporary sibling behind", async (t) => {
  const { root, store } = await tempStore(t, "job");
  await queued(store, "job-1");
  await store.claimNext("owner-a");
  await store.finalize("job-1", "owner-a", "completed", { result: { message: "done" } });

  assert.deepEqual(await fs.readdir(path.join(root, "jobs")), ["job-1.json"]);
  const record = await store.read("job-1");
  assert.equal(record.status, "completed");
  assert.equal(record.result.message, "done");
  assert.equal(record.lease, null);
});

test("a live lease blocks a second claimant until it goes stale", async (t) => {
  const { store } = await tempStore(t, "job");
  await queued(store, "job-1");
  await queued(store, "job-2");

  const first = await store.claimNext("owner-a");
  assert.equal(first.jobId, "job-1", "the oldest queued job is claimed first");
  assert.equal(first.attempts, 1);
  const second = await store.claimNext("owner-b");
  assert.equal(second.jobId, "job-2", "the held job-1 is skipped, not double-claimed");
  assert.equal(await store.claimNext("owner-c"), null, "a fresh lease is still held");

  const next = await store.claimNext("owner-b", { now: Date.now() + HOUR, leaseStaleAfterMs: 60_000 });
  assert.equal(next, null, "stale attempts are failed instead of reclaimed");
  const interrupted = await store.read("job-1");
  assert.equal(interrupted.status, "failed");
  assert.equal(interrupted.error.code, "JOB_INTERRUPTED");
  const secondInterrupted = await store.read("job-2");
  assert.equal(secondInterrupted.status, "failed");
  assert.equal(secondInterrupted.error.code, "JOB_INTERRUPTED");
});

test("only the lease holder can settle a job", async (t) => {
  const { store } = await tempStore(t, "job");
  await queued(store, "job-1");
  await store.claimNext("owner-a");
  await store.finalize("job-1", "owner-b", "completed", { result: { message: "stolen" } });

  const record = await store.read("job-1");
  assert.equal(record.status, "running");
  assert.equal(record.result, null);
});

test("cancelling a queued job settles it, cancelling a running job only flags", async (t) => {
  const { store } = await tempStore(t, "job");
  await queued(store, "queued");
  await queued(store, "running");

  const settled = await store.requestCancel("queued");
  assert.equal(settled.status, "cancelled");
  assert.ok(settled.completedAt);

  await store.claimNext("owner-a");
  const running = await store.requestCancel("running");
  assert.equal(running.status, "running");
  assert.equal(running.cancelRequested, true);

  const again = await store.requestCancel("queued");
  assert.equal(again.completedAt, settled.completedAt, "a settled job is not reopened");
});

test("a heartbeat keeps the lease alive against a reclaiming peer", async (t) => {
  const { store } = await tempStore(t, "job");
  await queued(store, "job-1");
  await store.claimNext("owner-a");
  await store.update("job-1", (job) => ({
    lease: { ...job.lease, heartbeatAt: new Date(Date.now() - HOUR).toISOString() },
  }));
  await store.renewLease("job-1", "owner-a");

  const after = await store.read("job-1");
  assert.ok(Date.now() - Date.parse(after.lease.heartbeatAt) < 5_000);
  assert.equal(await store.claimNext("owner-b", { leaseStaleAfterMs: 60_000 }), null);
});

test("a renew addressed to the wrong owner leaves the holder untouched", async (t) => {
  const { store } = await tempStore(t, "job");
  await queued(store, "job-1");
  await store.claimNext("owner-a");
  const before = await store.read("job-1");
  await store.renewLease("job-1", "not-the-owner");

  const after = await store.read("job-1");
  assert.equal(after.lease.heartbeatAt, before.lease.heartbeatAt);
  assert.equal(after.lease.owner, "owner-a");
});

function fakeRuntime({ auth = "authenticated", run } = {}) {
  const state = { closed: [], runs: 0, adapters: [] };
  const buildRuntime = ({ record }) => {
    const adapter = {
      escCancelRequested: false,
      launch: async () => {},
      getAuthState: async () => auth,
      close: async () => { state.closed.push(record.jobId); },
    };
    state.adapters.push(adapter);
    return {
      adapter,
      limits: {},
      allowedTools: new Set(record.allowedTools),
      runtime: {
        run: async () => {
          state.runs += 1;
          if (run) return run(adapter);
          return { sessionId: record.sessionId, message: "finished" };
        },
      },
    };
  };
  return { state, buildRuntime };
}

async function runnerHarness(t, options = {}) {
  const { root, store } = await tempStore(t, "runner");
  const fake = fakeRuntime(options);
  const runner = new JobRunner({
    store,
    sessionsDir: path.join(root, "sessions"),
    owner: "owner-a",
    pollIntervalMs: 5,
    heartbeatIntervalMs: HOUR,
    leaseStaleAfterMs: HOUR,
    executionTimeoutMs: options.executionTimeoutMs,
    loadSession: async () => ({}),
    buildRuntime: fake.buildRuntime,
  });
  // The loop only leaves its `while` once the running flag is down, so stopping
  // first drains the queue in one pass without waiting on a real idle poll.
  const settle = async () => {
    const loop = runner.start();
    await runner.stop();
    await loop;
  };
  return { root, store, runner, fake, settle };
}

test("the runner claims a queued job and stores its final message", async (t) => {
  const { store, fake, settle } = await runnerHarness(t);
  await queued(store, "job-1");
  await settle();

  const record = await store.read("job-1");
  assert.equal(record.status, "completed");
  assert.equal(record.result.message, "finished");
  assert.equal(record.error, null);
  assert.equal(record.lease, null);
  assert.equal(fake.state.runs, 1);
  assert.deepEqual(fake.state.closed, ["job-1"], "the adapter is closed even on success");
});

test("a job fails without spending a turn when the provider is not authenticated", async (t) => {
  const { store, fake, settle } = await runnerHarness(t, { auth: "unauthenticated" });
  await queued(store, "job-1");
  await settle();

  const record = await store.read("job-1");
  assert.equal(record.status, "failed");
  assert.equal(record.error.code, "PROVIDER_NOT_AUTHENTICATED");
  assert.equal(fake.state.runs, 0, "no quota is spent behind an unauthenticated wall");
  assert.deepEqual(fake.state.closed, ["job-1"]);
});

test("an interrupted run is recorded as cancelled, not failed", async (t) => {
  let announce;
  const started = new Promise((resolve) => { announce = resolve; });
  const { store, runner } = await runnerHarness(t, {
    run: async (adapter) => {
      announce();
      // A real adapter is interrupted by the ESC flag and throws once it lands.
      await waitForCancelFlag(adapter);
      throw new Error("interrupted by ESC");
    },
  });
  await queued(store, "job-1");

  const loop = runner.start();
  await started;
  const cancelled = await runner.cancel("job-1");
  assert.equal(cancelled.status, "running", "a running job is flagged, not settled early");
  await runner.stop();
  await loop;

  const record = await store.read("job-1");
  assert.equal(record.status, "cancelled");
  assert.equal(record.error.code, "JOB_CANCELLED");
  assert.equal(record.result, null);
});

test("a job that exceeds its execution timeout ends as a failure", async (t) => {
  const { store, settle } = await runnerHarness(t, {
    executionTimeoutMs: 10,
    run: async (adapter) => {
      await waitForCancelFlag(adapter);
      throw new Error("interrupted by timeout");
    },
  });
  await queued(store, "job-1");
  await settle();

  const record = await store.read("job-1");
  assert.equal(record.status, "failed");
  assert.equal(record.error.code, "JOB_TIMEOUT");
});

test("a cancel that outlived its holder is honoured on reclaim instead of re-run", async (t) => {
  const { store, fake, settle } = await runnerHarness(t);
  await queued(store, "job-1");
  await store.claimNext("owner-a");
  await store.requestCancel("job-1");
  await store.update("job-1", (job) => ({
    // The holder died after the cancel landed, leaving a lease nobody renews.
    lease: { ...job.lease, heartbeatAt: new Date(0).toISOString() },
  }));
  await settle();

  assert.equal(fake.state.runs, 0);
  const record = await store.read("job-1");
  assert.equal(record.status, "cancelled");
  assert.equal(record.attempts, 1, "the cancelled holder is not reclaimed for another attempt");
  assert.equal(record.error.code, "JOB_CANCELLED");
});

test("a restarted process settles the job its predecessor left running", async (t) => {
  const { root, store } = await tempStore(t, "crash");
  await queued(store, "job-1");
  const dead = await store.claimNext("owner-dead");
  assert.equal(dead.status, "running");
  await store.update("job-1", (job) => ({
    lease: { ...job.lease, heartbeatAt: new Date(0).toISOString() },
  }));

  const fake = fakeRuntime();
  const restarted = new JobRunner({
    store,
    sessionsDir: path.join(root, "sessions"),
    owner: "owner-alive",
    pollIntervalMs: 5,
    heartbeatIntervalMs: HOUR,
    leaseStaleAfterMs: 60_000,
    loadSession: async () => ({}),
    buildRuntime: fake.buildRuntime,
  });
  const loop = restarted.start();
  await restarted.stop();
  await loop;

  const record = await store.read("job-1");
  assert.equal(record.status, "failed");
  assert.equal(record.attempts, 1, "an interrupted side-effecting attempt is not replayed");
  assert.equal(record.error.code, "JOB_INTERRUPTED");
  assert.equal(record.result, null);
  assert.equal(fake.state.runs, 0);
});

test("a runtime that throws leaves a readable failure on the record", async (t) => {
  const { root, store } = await tempStore(t, "throw");
  await queued(store, "job-1");
  const runner = new JobRunner({
    store,
    sessionsDir: path.join(root, "sessions"),
    owner: "owner-a",
    pollIntervalMs: 5,
    heartbeatIntervalMs: HOUR,
    leaseStaleAfterMs: HOUR,
    loadSession: async () => ({}),
    buildRuntime: () => { throw new Error("holder died mid-turn"); },
  });
  const loop = runner.start();
  await runner.stop();
  await loop;

  const record = await store.read("job-1");
  assert.equal(record.status, "failed");
  assert.equal(record.attempts, 1);
  assert.equal(record.error.code, "JOB_EXECUTION_FAILED");
  assert.equal(record.error.message, "holder died mid-turn");
});

test("the headless approval grants only the tools the job was created with", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "neuralforge-headless-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const session = await TaskSession.create({
    sessionsDir: path.join(root, "sessions"),
    projectRoot: root,
    task: "headless",
  });
  const { runtime, allowedTools } = createHeadlessRuntime({
    session,
    record: { jobId: "job-1", provider: "chatgpt", allowedTools: ["fs.read", "fs.list", "fs.read"] },
    profileDir: path.join(root, "profile"),
    createAdapter: () => ({
      escCancelRequested: false,
      getAuthState: async () => "authenticated",
      close: async () => {},
    }),
  });

  assert.deepEqual([...allowedTools], ["fs.read", "fs.list"], "grants are de-duplicated, order kept");
  const decide = (name) => runtime.approval({ toolCall: { name }, reasons: [] });
  assert.equal(await decide("fs.read"), true);
  assert.equal(await decide("fs.write"), false, "a write was never granted");
  assert.equal(await decide("terminal.exec"), false, "a shell was never granted");
});

async function request(port, method, route, body, headers = {}) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const response = await new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      method,
      path: route,
      headers: {
        ...headers,
        ...(payload
          ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(payload)) }
          : {}),
      },
    }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, text, headers: res.headers }));
    });
    req.on("error", reject);
    // A gateway that accepts the socket and stays silent must fail the test,
    // not run it down to the suite-wide timeout.
    req.setTimeout(10_000, () => req.destroy(new Error(`gateway did not answer ${method} ${route} within 10s`)));
    if (payload) req.write(payload);
    req.end();
  });
  return {
    status: response.status,
    json: response.text ? JSON.parse(response.text) : null,
    headers: response.headers,
  };
}

async function gatewayHarness(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "neuralforge-gateway-"));
  const server = new GatewayServer({ port: 0, baseDir: root, projectRoot: root, runJobs: false });
  await server.listen();
  // Registered before the rm so it runs first: a listening server holds the dir.
  t.after(async () => {
    try {
      await server.close();
    } catch (err) {
      console.error('Gateway close error:', err);
      // Continue anyway to avoid hanging tests
    }
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, server, port: server.boundPort };
}

test("the standalone gateway only grants browser CORS to local applications", async (t) => {
  const { port } = await gatewayHarness(t);
  const blocked = await request(port, "GET", "/health", undefined, { origin: "https://attacker.example" });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers["access-control-allow-origin"], undefined);
  const blockedPreflight = await request(port, "OPTIONS", "/v1/jobs", undefined, {
    origin: "https://attacker.example",
  });
  assert.equal(blockedPreflight.status, 403);
  assert.equal(blockedPreflight.headers["access-control-allow-origin"], undefined);

  const allowedOrigin = "http://localhost:3000";
  const allowed = await request(port, "GET", "/health", undefined, { origin: allowedOrigin });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers["access-control-allow-origin"], allowedOrigin);
  const allowedPreflight = await request(port, "OPTIONS", "/v1/jobs", undefined, {
    origin: allowedOrigin,
  });
  assert.equal(allowedPreflight.status, 204);
  assert.equal(allowedPreflight.headers["access-control-allow-origin"], allowedOrigin);
  assert.match(allowedPreflight.headers["access-control-allow-methods"], /POST/);
});

test("the job routes accept an id but refuse a traversal path", async (t) => {
  const { root, port } = await gatewayHarness(t);
  const created = await request(port, "POST", "/v1/jobs", {
    task: "read the readme",
    projectRoot: path.join(root, "outside"),
  });
  assert.equal(created.status, 201);
  const jobId = created.json.jobId;
  assert.match(created.json.sessionId, /^session_/, "the job records its own session id");
  assert.deepEqual(created.json.allowedTools, [], "callers cannot grant tools to background jobs");
  assert.equal(created.json.status, "pending");
  assert.equal(created.json.attempts, 0);
  assert.equal(created.json.projectRoot, root, "job requests cannot replace the server-owned project root");

  const logs = await request(port, "GET", `/v1/jobs/${jobId}/logs`);
  assert.equal(logs.status, 200, "the id is read from its own segment, not the last one");
  assert.equal(logs.json.jobId, jobId);

  assert.equal((await request(port, "GET", `/v1/jobs/${jobId}/status`)).json.status, "pending");
  assert.equal((await request(port, "GET", "/v1/jobs/..%2F..%2Fetc")).status, 400);
  assert.equal((await request(port, "GET", "/v1/jobs/nope/logs")).status, 404);
  assert.equal((await request(port, "GET", "/v1/jobs/abc/def")).status, 404);
  assert.equal((await request(port, "DELETE", "/v1/jobs/nope")).json.error.message, "Job nope not found");
  assert.equal((await request(port, "GET", "/v1/jobs")).json.length, 1);
});

test("a submitted job needs a task and cannot provide tool grants", async (t) => {
  const { port } = await gatewayHarness(t);
  assert.equal((await request(port, "POST", "/v1/jobs", { task: "   " })).status, 400);
  assert.equal((await request(port, "POST", "/v1/jobs", {})).status, 400);
  const grantAttempt = await request(port, "POST", "/v1/jobs", {
    task: "edit source",
    allowedTools: ["fs.write", "terminal.exec"],
  });
  assert.equal(grantAttempt.status, 400);
  assert.match(grantAttempt.json.error.message, /controlled by the server/);
  assert.deepEqual((await request(port, "GET", "/v1/jobs")).json, []);
});

test("deleting over HTTP settles a queued job as cancelled", async (t) => {
  const { port } = await gatewayHarness(t);
  const created = await request(port, "POST", "/v1/jobs", { task: "hold the browser" });
  const cancelled = await request(port, "DELETE", `/v1/jobs/${created.json.jobId}`);

  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.json.status, "cancelled");
  const status = await request(port, "GET", `/v1/jobs/${created.json.jobId}/status`);
  assert.equal(status.json.status, "cancelled");
  assert.equal(status.json.error.code, "JOB_CANCELLED");
  assert.equal(status.json.attempts, 0, "a queued cancel never consumed an attempt");
});
