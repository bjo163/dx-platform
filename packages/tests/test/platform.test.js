import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getAppDataDir } from "@neuralforge/platform/paths";
import { discoverChromeExecutable } from "@neuralforge/platform/chrome-discovery";

test("new NeuralForge home overrides the legacy environment variable", () => {
  const result = getAppDataDir(undefined, {
    env: {
      WTAGENT_HOME: "/tmp/neuralforge-new",
      WEBAGENT_HOME: "/tmp/neuralforge-legacy",
    },
    platform: "linux",
    homeDir: "/home/tester",
    exists: () => false,
  });

  assert.equal(result, "/tmp/neuralforge-new");
});

test("legacy home remains a compatibility fallback", () => {
  const result = getAppDataDir(undefined, {
    env: { WEBAGENT_HOME: "/tmp/neuralforge-legacy" },
    platform: "linux",
    homeDir: "/home/tester",
    exists: () => false,
  });

  assert.equal(result, "/tmp/neuralforge-legacy");
});

test("fresh installs use the neuralforge application data directory", () => {
  const result = getAppDataDir(undefined, {
    env: {},
    platform: "linux",
    homeDir: "/home/tester",
    exists: () => false,
  });

  assert.equal(result, "/home/tester/.local/share/neuralforge");
});

test("an existing legacy NeuralForge profile is reused without moving user data", () => {
  const legacySessions = "/home/tester/.local/share/webagent/sessions";
  const result = getAppDataDir(undefined, {
    env: {},
    platform: "linux",
    homeDir: "/home/tester",
    exists: (candidate) => candidate === legacySessions,
  });

  assert.equal(result, "/home/tester/.local/share/webagent");
});

test("WTAGENT_CHROME_PATH overrides the legacy Chrome path", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "neuralforge-platform-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const current = path.join(directory, "current-chrome");
  const legacy = path.join(directory, "legacy-chrome");
  await Promise.all([
    fs.writeFile(current, ""),
    fs.writeFile(legacy, ""),
  ]);

  const result = discoverChromeExecutable(undefined, {
    env: {
      WTAGENT_CHROME_PATH: current,
      WEBAGENT_CHROME_PATH: legacy,
    },
    platform: process.platform,
  });

  assert.equal(result, current);
});
