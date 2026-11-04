
import test from "./packages/tests/src/shim.js";
import assert from "node:assert/strict";
import { JobStore, JobRunner, createHeadlessRuntime } from "@neuralforge/job";
import { GatewayServer } from "../../packages/gateway/dist/index.js";

async function runTest() {
  console.log("Running test...");
  // This is a simplified version of the gatewayHarness
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { mkdtemp } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  
  const root = await mkdtemp(join(tmpdir(), "neuralforge-gateway-test-"));
  console.log("Root:", root);
  
  const server = new GatewayServer({ port: 0, baseDir: root, runJobs: false });
  console.log("Server created");
  await server.listen();
  console.log("Server listening on", server.boundPort);
  
  await server.close();
  console.log("Server closed");
  
  // Clean up
  const { rm } = await import("node:fs/promises");
  await rm(root, { recursive: true, force: true });
  console.log("Cleanup complete");
}

runTest().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
