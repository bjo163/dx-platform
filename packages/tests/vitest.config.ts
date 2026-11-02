import { defineConfig } from "vitest/config";

// These specs spawn Chrome, bind loopback ports and take a session mutex, so one
// file runs at a time in its own process and the budgets are generous.
export default defineConfig({
  test: {
    include: ["test/**/*.test.js"],
    environment: "node",
    pool: "forks",
    fileParallelism: false,
    testTimeout: 300_000,
    hookTimeout: 120_000,
    teardownTimeout: 60_000,
  },
});
