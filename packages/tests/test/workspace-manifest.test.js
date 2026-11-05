import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// test -> packages/tests -> packages -> repository root
const root = path.resolve(here, "..", "..", "..");

const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const exists = (...parts) => fs.existsSync(path.join(root, ...parts));

function walk(dir, keep) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full, keep));
    else if (keep(entry.name)) found.push(full);
  }
  return found;
}

// Both lanes count: packages/*/test holds *.spec.ts, the private harness holds
// *.test.js. A script that points at neither is a phantom.
const isSpec = (name) => /\.(spec|test)\.[jt]sx?$/.test(name);
const isSource = (name) => /\.(ts|tsx|js|mjs)$/.test(name) && !name.endsWith(".d.ts");

const workspacePatterns = [...read("pnpm-workspace.yaml").matchAll(/^  - (\S+)$/gm)].map((m) => m[1]);

const packages = workspacePatterns.map((rel) => ({
  rel,
  pkg: JSON.parse(read(rel, "package.json")),
}));
const packageNames = new Set(packages.map((entry) => entry.pkg.name));

// Packages that legitimately have nothing to compile. An entry here is a debt
// note with a reason, so the list must stay short and must not go stale.
const BUILD_SCRIPT_EXCEPTIONS = {
  "packages/tests": "private vitest harness: it runs other packages, it publishes no dist of its own",
};

const sourceBlobs = [
  ...walk(path.join(root, "packages"), isSource).filter((f) => f.includes(`${path.sep}src${path.sep}`)),
  ...walk(path.join(root, "apps"), isSource).filter((f) => f.includes(`${path.sep}src${path.sep}`)),
].map((file) => ({ file, text: fs.readFileSync(file, "utf8") }));

test("every workspace pattern resolves to a package manifest", () => {
  assert.ok(workspacePatterns.length >= 20, "expected the declared workspace to be found");
  for (const rel of workspacePatterns) {
    assert.ok(exists(rel, "package.json"), `workspace pattern points at a folder with no manifest: ${rel}`);
  }
  // A folder with a manifest that is not listed in pnpm-workspace.yaml is
  // invisible to install, build, and CI.
  const stray = [];
  for (const parent of ["packages", "apps"]) {
    const dir = path.join(root, parent);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const rel = `${parent}/${entry.name}`;
      if (exists(rel, "package.json") && !workspacePatterns.includes(rel)) stray.push(rel);
    }
  }
  assert.deepEqual(stray, [], "found packages missing from pnpm-workspace.yaml");
});

test("every package has a build script or a recorded reason", () => {
  const unexplained = [];
  for (const { rel, pkg } of packages) {
    const hasBuild = Boolean((pkg.scripts || {}).build);
    if (!hasBuild && !BUILD_SCRIPT_EXCEPTIONS[rel]) unexplained.push(`${rel} (${pkg.name})`);
  }
  assert.deepEqual(unexplained, [], "packages without a build script need a reason in BUILD_SCRIPT_EXCEPTIONS");

  const stale = Object.keys(BUILD_SCRIPT_EXCEPTIONS).filter((rel) => {
    const entry = packages.find((candidate) => candidate.rel === rel);
    return !entry || Boolean((entry.pkg.scripts || {}).build);
  });
  assert.deepEqual(stale, [], "an exception entry no longer matches reality; remove it");
});

test("a package with specs has a test script, and a test script has specs", () => {
  const missing = [];
  const phantom = [];
  for (const { rel, pkg } of packages) {
    const specs = walk(path.join(root, rel, "test"), isSpec);
    const testScript = (pkg.scripts || {}).test;
    if (specs.length > 0 && !testScript) missing.push(rel);
    if (testScript && specs.length === 0) phantom.push(`${rel} -> ${testScript}`);
  }
  assert.deepEqual(missing, [], "packages with spec files are not runnable per-package");
  assert.deepEqual(phantom, [], "test scripts point at folders with no spec files");
});

test("root vitest include list has no duplicates and no phantom globs", () => {
  const config = read("vitest.config.ts");
  const block = /include: \[([\s\S]*?)\]/.exec(config);
  assert.ok(block, "could not find the include array in vitest.config.ts");
  const patterns = [...block[1].matchAll(/'([^']+)'|\"([^\"]+)\"/g)].map((m) => m[1] ?? m[2]);
  assert.ok(patterns.length > 0, "the root include list is empty");

  const duplicates = patterns.filter((pattern, index) => patterns.indexOf(pattern) !== index);
  assert.deepEqual(duplicates, [], "a duplicated glob makes one file run twice");

  const empty = patterns.filter((pattern) => {
    const dir = pattern.split("/**/")[0];
    const absolute = path.join(root, dir);
    const match = walk(absolute, (name) => {
      if (pattern.includes(".spec.ts")) return isSpec(name);
      if (pattern.includes(".test.")) return name.endsWith(".test.js") || name.endsWith(".test.ts");
      return /\.(spec|test)\.[tj]s(x?)$/.test(name);
    });
    return match.length === 0;
  });
  assert.deepEqual(empty, [], "include globs that match no file are phantom: they look like coverage and give none");
});

test("internal dependencies name real workspace packages", () => {
  const orphan = [];
  for (const { rel, pkg } of packages) {
    for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
      for (const [dep, range] of Object.entries(pkg[section] || {})) {
        const internal = dep.startsWith("@dx-platform/") || dep === "neuralforge";
        if (!internal) continue;
        if (!packageNames.has(dep)) orphan.push(`${rel} ${section}: ${dep} is not a workspace package`);
        else if (typeof range === "string" && !range.startsWith("workspace:")) {
          orphan.push(`${rel} ${section}: ${dep} must use workspace:, got ${range}`);
        }
      }
    }
  }
  assert.deepEqual(orphan, [], "workspace-internal dependencies are orphaned or versioned like npm packages");
});

test("bin and export targets point at files the build can produce", () => {
  const broken = [];
  for (const { rel, pkg } of packages) {
    const targets = [];
    const bin = typeof pkg.bin === "string" ? { [pkg.name]: pkg.bin } : pkg.bin || {};
    for (const [name, file] of Object.entries(bin)) targets.push([`bin:${name}`, file]);
    for (const field of ["main", "module", "types", "browser"]) {
      if (typeof pkg[field] === "string") targets.push([field, pkg[field]]);
    }
    const collect = (node, label) => {
      if (typeof node === "string") targets.push([label, node]);
      else if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) collect(value, `${label} -> ${key}`);
      }
    };
    if (pkg.exports) collect(pkg.exports, "exports");

    for (const [label, target] of targets) {
      if (String(target).includes("*")) continue;
      const built = path.join(root, rel, String(target));
      if (fs.existsSync(built)) continue;
      const source = String(target)
        .replace(/^\.?\/dist\//, "src/")
        .replace(/\.d\.ts$/, ".ts")
        .replace(/\.js$/, ".ts");
      const candidates = [
        path.join(root, rel, source),
        path.join(root, rel, source.replace(/\.ts$/, "/index.ts")),
        path.join(root, rel, "src", path.basename(source, ".ts") + ".ts"),
      ];
      if (!candidates.some((candidate) => fs.existsSync(candidate))) {
        broken.push(`${rel} ${label}: ${target} has no built file and no ${source} to produce it`);
      }
    }
  }
  assert.deepEqual(broken, [], "a manifest may not export a module that cannot exist");
});

test("every env name documented in .env.example has a reader", () => {
  assert.ok(exists(".env.example"), ".env.example must exist to be checked");
  const example = read(".env.example");
  const names = [...example.matchAll(/^\s*#?\s*([A-Z][A-Z0-9_]{2,})=/gm)].map((m) => m[1]);
  assert.ok(names.length >= 10, "expected the documented env list to be non-trivial");

  const unread = [...new Set(names)].filter((name) => {
    const needles = [`process.env.${name}`, `process.env["${name}"]`, `process.env?.${name}`, `env.${name}`];
    return !sourceBlobs.some((blob) => needles.some((needle) => blob.text.includes(needle)));
  });
  assert.deepEqual(unread, [], "documenting an env name nobody reads teaches users to set a dead knob");
});

test("CI package filters select packages that exist", () => {
  const workflow = read(".github", "workflows", "ci.yml");
  const filters = [...new Set([...workflow.matchAll(/--filter\s+(['"]?)([^\s'"]+)\1/g)].map((m) => m[2]))];
  assert.ok(filters.length >= 3, "expected the workflow to target several packages");
  // pnpm exits 0 when a filter matches nothing, so a typo here silently no-ops.
  const unknown = filters.filter((filter) => !packageNames.has(filter));
  assert.deepEqual(unknown, [], `CI filters match no workspace package: ${unknown.join(", ")}`);
});
