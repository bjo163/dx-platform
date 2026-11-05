// Asserts that a build made from a pristine checkout produced every entrypoint
// the manifests promise. Run after `pnpm build` in CI: on a fresh checkout no
// dist/ exists before the build, so a missing file here is a real gap, not a
// stale local artifact.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const solution = JSON.parse(fs.readFileSync(path.join(root, "tsconfig.json"), "utf8"));
const graph = (solution.references || []).map((r) => r.path.replace(/^(\.\/|\/)/, "").replace(/\/$/, ""));

const targetsOf = (pkg) => {
  const found = [];
  const bin = typeof pkg.bin === "string" ? { [pkg.name]: pkg.bin } : pkg.bin || {};
  for (const [name, file] of Object.entries(bin)) found.push([`bin:${name}`, file]);
  for (const field of ["main", "types", "module", "browser"]) {
    if (typeof pkg[field] === "string") found.push([field, pkg[field]]);
  }
  return found;
};

const missing = [];
for (const rel of graph) {
  const manifestPath = path.join(root, rel, "package.json");
  if (!fs.existsSync(manifestPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const [label, target] of targetsOf(pkg)) {
    if (String(target).includes("*")) continue;
    if (!fs.existsSync(path.join(root, rel, String(target)))) {
      missing.push(`${rel} ${label}: ${target}`);
    }
  }
}

if (missing.length > 0) {
  console.error(`build produced no file for ${missing.length} manifest target(s):`);
  for (const line of missing) console.error(`  - ${line}`);
  process.exit(1);
}

console.log(`verified build output for ${graph.length} packages in the root solution`);
