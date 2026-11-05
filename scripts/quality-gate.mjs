#!/usr/bin/env node --input-type=module

import { spawnSync } from "node:child_process";

/**
 * Quality gate script for local development.
 * Runs selected verification gates to validate a clean build and test suite.
 *
 * Individual gates can be run:
 *   pnpm exec node scripts/quality-gate.mjs install
 *   pnpm exec node scripts/quality-gate.mjs build
 *   pnpm exec node scripts/quality-gate.mjs check
 *   pnpm exec node scripts/quality-gate.mjs test
 */

function run(args) {
  const result = spawnSync("pnpm", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "install") {
    console.log("Running: pnpm install --frozen-lockfile --ignore-scripts");
    run(["install", "--frozen-lockfile", "--ignore-scripts"]);
  } else if (command === "build") {
    console.log("Running: pnpm build");
    run(["build"]);
  } else if (command === "api") {
    console.log("Running: pnpm --filter @dx-platform/api build");
    run(["build", "--filter", "@dx-platform/api"]);
  } else if (command === "web") {
    console.log("Running: pnpm --filter @dx-platform/web build");
    run(["build", "--filter", "@dx-platform/web"]);
  } else if (command === "check") {
    console.log("Running: pnpm check");
    run(["check"]);
  } else if (command === "test") {
    console.log("Running: pnpm test");
    run(["test"]);
  } else if (command === "pack") {
    console.log("Running: pnpm --filter neuralforge pack --dry-run");
    const result = spawnSync("pnpm", ["--filter", "neuralforge", "pack", "--dry-run"]);
    const output = result.stdout ?? "";
    if (output.includes("cache") || output.includes("private") || output.includes("__pycache__")) {
      console.error("FAILED: packed tarball contains cache or private paths");
      process.exit(1);
    }
    console.log("PASS: packed tarball has no cache or private paths");
  } else if (command === "cli") {
    console.log("Running: CLI smoke test");
    const result = spawnSync("pnpm", [
      "--filter",
      "neuralforge",
      "exec",
      "node",
      "dist/main.js",
      "--version",
    ], { stdio: "inherit" });
    if (result.status !== 0) process.exit(1);
  } else {
    console.error("Usage: pnpm exec node scripts/quality-gate.mjs <command>");
    console.error("Commands: install, build, api, web, check, test, pack, cli");
    process.exit(1);
  }
}

main();