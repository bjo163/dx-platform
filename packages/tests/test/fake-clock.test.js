import test from "../src/shim.js";
import assert from "node:assert/strict";
import path from "node:path";
import { JobStore } from "@neuralforge/job";
import { useTempDir } from "../src/temp-dir";
import { useFakeClock } from "../src/fake-clock.js";

const MINUTE = 60_000;
const EPOCH = Date.parse("2026-01-01T00:00:00.000Z");

async function storeHarness(t) {
  const root = await useTempDir(t, "fake-clock");
  const store = new JobStore(path.join(root, "jobs"));
  await store.initialize();
  const clock = useFakeClock(t, { now: EPOCH });
  await store.create({
    jobId: "job-1",
    task: "task for job-1",
    sessionId: "session_for_job-1",
    projectRoot: "Z:/scratch",
    provider: "chatgpt",
    allowedTools: ["fs.read"],
  });
  return { store, clock };
}

test("a lease expires on the clock rather than on an injected timestamp", async (t) => {
  const { store, clock } = await storeHarness(t);
  await store.claimNext("owner-a");

  assert.equal(
    await store.claimNext("owner-b", { leaseStaleAfterMs: MINUTE }),
    null,
    "a fresh lease is still held",
  );

  // Two hours pass without the process waiting at all.
  await clock.advance(2 * 60 * MINUTE);
  assert.equal(clock.now() - EPOCH, 2 * 60 * MINUTE);

  assert.ok(await store.isLeaseStale(await store.read("job-1"), MINUTE));
  assert.equal(await store.claimNext("owner-b", { leaseStaleAfterMs: MINUTE }), null);
  const interrupted = await store.read("job-1");
  assert.equal(interrupted.status, "failed");
  assert.equal(interrupted.error.code, "JOB_INTERRUPTED");
});

test("a heartbeat renews the lease against the same clock", async (t) => {
  const { store, clock } = await storeHarness(t);
  await store.claimNext("owner-a");
  const claimed = await store.read("job-1");

  await clock.advance(45 * MINUTE);
  await store.renewLease("job-1", "owner-a");
  const renewed = await store.read("job-1");
  assert.equal(Date.parse(renewed.lease.heartbeatAt) - Date.parse(claimed.lease.heartbeatAt), 45 * MINUTE);
  assert.equal(await store.claimNext("owner-b", { leaseStaleAfterMs: 60 * MINUTE }), null);

  await clock.advance(90 * MINUTE);
  assert.equal(await store.claimNext("owner-b", { leaseStaleAfterMs: 60 * MINUTE }), null);
  assert.equal((await store.read("job-1")).error.code, "JOB_INTERRUPTED");
});

test("a timeout fires on the fake clock instead of a long sleep", async (t) => {
  const clock = useFakeClock(t, { apis: ["setTimeout"] });

  const pending = new Promise((resolve) => {
    setTimeout(() => resolve("deadline reached"), 10 * MINUTE);
  });
  await clock.advance(9 * MINUTE);
  assert.equal(await Promise.race([pending, "still waiting"]), "still waiting");

  await clock.advance(MINUTE);
  assert.equal(await pending, "deadline reached");
});
