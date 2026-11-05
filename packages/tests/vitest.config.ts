import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// These specs bind loopback ports and take a session mutex, so one file runs at
// a time in its own process and the budgets are generous.
//
// The browser specs live in test/browser and form their own lane: the unit lane
// must not need Chromium, and the browser lane runs every labelled file instead
// of a file list maintained by hand in the workflow.
const browserLane = process.env.WTAGENT_DOM_TESTS === "1";

export default defineConfig({
  test: {
    include: browserLane ? ["test/browser/**/*.test.js"] : ["test/**/*.test.js"],
    exclude: browserLane ? [] : ["test/browser/**"],
    environment: "node",
    pool: "forks",
    fileParallelism: false,
    testTimeout: 300_000,
    hookTimeout: 120_000,
    teardownTimeout: 60_000,
    reporter: ["verbose"],
  },
  resolve: {
    alias: {
      '@neuralforge/types': resolve(__dirname, '../types/dist'),
      '@neuralforge/shared': resolve(__dirname, '../shared/dist'),
      '@neuralforge/protocol': resolve(__dirname, '../protocol/dist'),
      '@neuralforge/policy': resolve(__dirname, '../policy/dist'),
      '@neuralforge/platform': resolve(__dirname, '../platform/dist'),
      '@neuralforge/tools': resolve(__dirname, '../tools/dist'),
      '@neuralforge/browser': resolve(__dirname, '../browser/dist'),
      '@neuralforge/artifacts': resolve(__dirname, '../artifacts/dist'),
      '@neuralforge/audio': resolve(__dirname, '../audio/dist'),
      '@neuralforge/image': resolve(__dirname, '../image/dist'),
      '@neuralforge/session': resolve(__dirname, '../session/dist'),
      '@neuralforge/runtime': resolve(__dirname, '../runtime/dist'),
      '@neuralforge/job': resolve(__dirname, '../job/dist'),
      '@neuralforge/mcp': resolve(__dirname, '../mcp/dist'),
      '@neuralforge/gateway': resolve(__dirname, '../gateway/dist'),
      '@neuralforge/sdk': resolve(__dirname, '../sdk/dist'),
      '@neuralforge/cli': resolve(__dirname, '../cli/dist'),
      '@neuralforge/errors': resolve(__dirname, '../errors/dist'),
      '@neuralforge/database': resolve(__dirname, '../database/dist'),
      '@neuralforge/plugins': resolve(__dirname, '../plugins/dist'),
      '@neuralforge/config-api': resolve(__dirname, '../config-api/dist'),
      '@neuralforge/local': resolve(__dirname, '../local/dist'),
      '@neuralforge/ws-server': resolve(__dirname, '../ws-server/dist'),
      '@neuralforge/observability': resolve(__dirname, '../observability/dist'),
      '@neuralforge/openapi': resolve(__dirname, '../openapi/dist'),
    },
  },
});
