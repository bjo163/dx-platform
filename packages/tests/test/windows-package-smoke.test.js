import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { runProgram } from "@neuralforge/tools/terminal-exec";
import { cliManifestPath, repositoryRoot } from "../src/layout.js";

function getManifest() {
  return JSON.parse(fsSync.readFileSync(cliManifestPath, "utf8"));
}

// Dormant unless a tarball is provided: packing works, but installing it fails
// with E404 until the @neuralforge/* workspace dependencies are published, because
// pnpm rewrites workspace:* to exact versions that the registry does not have.
test("packed tarball installs globally on Windows with an isolated prefix", {
  skip: process.platform !== "win32" || !process.env.WTAGENT_PACKED_TGZ,
}, async (t) => {
  const manifest = getManifest();
  const prefix = await fs.mkdtemp(path.join(os.tmpdir(), "neuralforge-pack-smoke-"));
  t.after(() => fs.rm(prefix, { recursive: true, force: true }));

  const tarball = path.resolve(repositoryRoot, process.env.WTAGENT_PACKED_TGZ);
  await fs.stat(tarball);

  const installed = await runProgram({
    program: "npm",
    argv: [
      "install",
      "-g",
      "--prefix",
      prefix,
      "--registry=https://registry.npmjs.org/",
      tarball,
    ],
    cwd: repositoryRoot,
    timeoutMs: 120_000,
    maxOutputBytes: 64 * 1024,
  });
  assert.equal(installed.ok, true, installed.stderr);

  const shimPath = path.join(prefix, "neuralforge.cmd");
  await fs.stat(shimPath);

  const version = await runProgram({
    program: shimPath,
    argv: ["--version"],
    cwd: repositoryRoot,
    timeoutMs: 30_000,
    maxOutputBytes: 4 * 1024,
  });
  assert.equal(version.ok, true, version.stderr);
  assert.equal(version.stdout.trim(), manifest.version);

  const doctor = await runProgram({
    program: shimPath,
    argv: ["doctor"],
    cwd: repositoryRoot,
    timeoutMs: 60_000,
    maxOutputBytes: 16 * 1024,
  });
  assert.equal(doctor.ok, true, doctor.stderr || doctor.stdout);
  assert.match(doctor.stdout, /Doctor: OK/);
  assert.match(doctor.stdout, /Node\/npm Windows command shim/);
});
