import { afterAll } from "vitest";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

interface Context {
  after(hook: () => unknown): void;
}

// Scratch paths must disappear whether the test passes or fails, so removal is
// registered at creation instead of being left to each test to remember.
export async function useTempDir(t: Context, prefix: string): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), `neuralforge-${prefix}-`));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  return dir;
}

// Adapters write diagnostics next to their profile directory, so a profile that
// points at the repository (`"."`) makes the suite drop files into the checkout.
// One directory per file is enough to keep those writes inside the temp root.
export function useScratchProfileDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `neuralforge-${prefix}-`));
  afterAll(() => fsp.rm(dir, { recursive: true, force: true }));
  return path.join(dir, "profile");
}
