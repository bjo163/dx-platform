import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The suite lives in packages/tests but exercises the repository as a whole: it
// spawns the built CLI and reads workspace manifests. These are the only four
// places the layout is allowed to be spelled out.
const here = path.dirname(fileURLToPath(import.meta.url));

// packages/tests/src → repository root
export const repositoryRoot = path.resolve(here, "..", "..", "..");
export const packagesDir = path.join(repositoryRoot, "packages");
export const cliManifestPath = path.join(packagesDir, "cli", "package.json");
export const cliEntry = path.join(packagesDir, "cli", "dist", "main.js");
export const testsTestDir = path.join(repositoryRoot, "packages", "tests", "test");
export const windowsScriptFixtures = path.join(repositoryRoot, "scripts", "windows-fixtures");

export function workspaceManifests() {
  return fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesDir, entry.name, "package.json"))
    .filter((file) => fs.existsSync(file));
}
