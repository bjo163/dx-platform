import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useTempDir, useScratchProfileDir } from "../src/temp-dir.js";

const repositoryRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..", "..");
const created = [];

test("useTempDir writes stay inside a scratch directory", async (t) => {
  const dir = await useTempDir(t, "cleanup");
  await fs.writeFile(path.join(dir, "artifact.txt"), "written by the test");
  assert.equal(await fs.readFile(path.join(dir, "artifact.txt"), "utf8"), "written by the test");
  created.push(dir);
});

// Declared second, because vitest runs a file's tests in order and the hook from
// the test above has already fired. onTestFinished is the same hook a failing
// test reaches, so passing here means pass and fail clean up identically.
test("the scratch directory is gone once its test has finished", async () => {
  assert.ok(created.length > 0, "the previous test registered a directory");
  for (const dir of created) {
    const stillThere = await fs.stat(dir).then(() => true, () => false);
    assert.equal(stillThere, false, `${dir} survived the test that created it`);
  }
});

test("a scratch profile keeps diagnostics out of the checkout", () => {
  const profile = useScratchProfileDir("profile");
  const diagnostics = path.join(profile, "..", "diagnostics");
  assert.ok(!path.resolve(diagnostics).startsWith(repositoryRoot), "diagnostics must not land inside the repository");
  assert.ok(path.resolve(diagnostics).startsWith(path.resolve(profile, "..")), "diagnostics stay under the scratch root");
});
