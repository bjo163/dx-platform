import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The identity the CLI reports and `neuralforge update` queries is the published app
// package, not the library that reads it. Relative to this module's directory the
// app manifest is two levels up in the workspace and three up beside @neuralforge/*.
const CANDIDATES = [
  "../../cli/package.json",
  "../../../neuralforge/package.json",
  "../package.json",
  "../../package.json",
];

const here = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_JSON_PATH = CANDIDATES
  .map((candidate) => path.resolve(here, candidate))
  .find((candidate) => fs.existsSync(candidate)) ?? path.resolve(here, CANDIDATES[2]);

let cached;

export function getPackageInfo() {
  cached ??= JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
  return cached;
}

export function getPackageName() {
  return getPackageInfo().name;
}

export function getPackageVersion() {
  return getPackageInfo().version;
}
