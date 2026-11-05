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

// `tsc -b` builds the projects listed in the root solution, so a package that is
// missing from it is never typechecked by `pnpm check` or by CI. Each exception
// below states why that is still correct.
const ROOT_GRAPH_EXCEPTIONS = {
  "apps/api": "not a composite project, so the solution refuses it; CI builds it through its own --filter step",
  "packages/ws-server": "compiles clean only after JobService.update/finalize and JobRecord.progress are settled",
};

// A package whose own sources do not compile cannot ship a passing typecheck
// command, so it is listed instead of given a script that would fail CI.
const TYPECHECK_EXCEPTIONS = {
  "packages/ws-server": "10 type errors: `private #field` syntax, http.Socket, and a JobService API that does not exist",
};

const rootSolution = JSON.parse(read("tsconfig.json"));
const rootGraph = new Set((rootSolution.references || []).map((r) => r.path.replace(/^(\.\/|\/)/, "")));
const hasTsconfig = (rel) => exists(rel, "tsconfig.json");
const hasBuildScript = (rel) => Boolean((JSON.parse(read(rel, "package.json")).scripts || {}).build);

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

test("every tsc -b package is in the root solution or has a recorded reason", () => {
  const unlisted = [];
  for (const { rel, pkg } of packages) {
    if ((pkg.scripts || {}).build !== "tsc -b") continue;
    if (!hasTsconfig(rel)) continue;
    if (!rootGraph.has(rel) && !ROOT_GRAPH_EXCEPTIONS[rel]) unlisted.push(rel);
  }
  assert.deepEqual(unlisted, [], "a package outside the root solution is never typechecked by `pnpm check`");

  const stale = Object.keys(ROOT_GRAPH_EXCEPTIONS).filter((rel) => {
    const entry = packages.find((candidate) => candidate.rel === rel);
    return !entry || rootGraph.has(rel) || (entry.pkg.scripts || {}).build !== "tsc -b";
  });
  assert.deepEqual(stale, [], "a graph exception that no longer applies hides a package from every check");
});

test("every typecheckable package has a typecheck command", () => {
  const missing = [];
  for (const { rel, pkg } of packages) {
    if (!hasTsconfig(rel)) continue;
    if (!(pkg.scripts || {}).typecheck && !TYPECHECK_EXCEPTIONS[rel]) missing.push(rel);
  }
  assert.deepEqual(missing, [], "packages with a tsconfig must expose `pnpm --filter <pkg> typecheck`");

  const stale = Object.keys(TYPECHECK_EXCEPTIONS).filter((rel) => {
    const entry = packages.find((candidate) => candidate.rel === rel);
    return !entry || Boolean((entry.pkg.scripts || {}).typecheck);
  });
  assert.deepEqual(stale, [], "a typecheck exception that now has a script is stale");
});

test("a package with specs has a test script, and a test script has specs", () => {  const missing = [];
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

const LINT_CONFIG_NAMES = [  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  ".eslintrc.yml",
  "biome.json",
  "biome.jsonc",
  ".oxlintrc.json",
];

test("a solution package emits into a build directory, not into src", () => {
  const noOutDir = [];
  for (const rel of rootGraph) {
    if (!exists(rel, "tsconfig.json")) continue;
    if (!hasBuildScript(rel)) continue;
    const config = read(rel, "tsconfig.json");
    if (!/"outDir"/.test(config)) noOutDir.push(rel);
  }
  assert.deepEqual(noOutDir, [], "a package without outDir emits next to its sources, where the manifest cannot find it");

  // A build script that emits nothing leaves the manifest promising a dist/ the
  // build can never produce.
  const suppressed = [...rootGraph].filter((rel) => {
    if (!exists(rel, "tsconfig.json") || !hasBuildScript(rel)) return false;
    return /"noEmit":\s*true/.test(read(rel, "tsconfig.json"));
  });
  assert.deepEqual(suppressed, [], "a package in the solution may not build with noEmit and still publish a main");

  const emitted = [];
  for (const { rel } of packages) {
    const srcDir = path.join(root, rel, "src");
    for (const file of walk(srcDir, (name) => /\.(js|mjs|cjs)$/.test(name) || name.endsWith(".d.ts"))) {
      const base = file.endsWith(".d.ts") ? file.slice(0, -".d.ts".length) : file.replace(/\.(js|mjs|cjs)$/, "");
      if (fs.existsSync(`${base}.ts`) || fs.existsSync(`${base}.tsx`)) {
        emitted.push(`${rel}: ${path.relative(path.join(root, rel), file)} sits beside its .ts source`);
      }
    }
  }
  assert.deepEqual(emitted, [], "build output committed into src/ shadows the source it was built from");
});

test("a lint script is only allowed where a lint configuration exists", () => {
  // DX2-0072 asks for a lint command only if lint is configured. The command is
  // the dangerous half: without a config file it fails, or worse, prompts.
  const declared = packages
    .filter(({ pkg }) => (pkg.scripts || {}).lint)
    .map(({ rel, pkg }) => ({ rel, command: pkg.scripts.lint }));

  const unsupported = declared.filter(({ rel }) => {
    return !LINT_CONFIG_NAMES.some((name) => exists(rel, name)) && !LINT_CONFIG_NAMES.some((name) => exists(name));
  });
  assert.deepEqual(unsupported, [], "a lint script with no configuration file is a command that cannot pass");

  if (declared.length === 0) {
    assert.ok(
      !LINT_CONFIG_NAMES.some((name) => exists(name)),
      "a lint config exists but no package declares a lint command",
    );
  }
});

test("a browser-dependent harness test is labelled by its directory", () => {
  // The unit lane must not need Chromium, so the files that launch a browser are
  // labelled by living under test/browser, and whether they run is decided by
  // what the machine has rather than by a flag a caller could forget.
  const harnessDir = path.join(root, "packages", "tests", "test");
  const relative = (file) => path.relative(harnessDir, file).split(path.sep).join("/");
  const files = walk(harnessDir, (name) => name.endsWith(".test.js"));
  // This file names the patterns below in order to detect them; it launches and
  // gates nothing itself.
  const scanned = files.map(relative).filter((rel) => rel !== "workspace-manifest.test.js");

  const needsBrowser = scanned.filter((rel) => {
    const source = fs.readFileSync(path.join(harnessDir, rel), "utf8");
    return /from ["']playwright-core["']/.test(source) || source.includes("chromium.launch(");
  });
  const unlabeled = needsBrowser.filter((rel) => !rel.startsWith("browser/"));
  assert.deepEqual(unlabeled, [], "a test that launches a browser must live in test/browser, or the unit lane needs Chromium");

  const envGated = scanned.filter((rel) => fs.readFileSync(path.join(harnessDir, rel), "utf8").includes("WTAGENT_DOM_TESTS"));
  assert.deepEqual(envGated, [], "skipping must come from the machine's capability, not from a flag a test could forget");

  const config = read("packages", "tests", "vitest.config.ts");
  assert.match(config, /browserLane/, "the harness config must split a unit lane from a browser lane");
  assert.ok(config.includes('"test/browser/**/*.test.js"'), "the browser lane is selected by directory, not by a file list");
  assert.ok(config.includes('"test/browser/**"'), "the unit lane must exclude the browser directory");

  const workflow = read(".github", "workflows", "ci.yml");
  assert.ok(!workflow.includes("test/chatgpt-dom.test.js"), "the dom job must run the labelled lane, not hand-picked files");
});

test("no unit-lane test waits out a long sleep", () => {
  // Lease expiry and timeout recovery are minutes of clock, not minutes of wall
  // time: those tests advance the fake clock instead. A real second-scale sleep
  // here is what makes the suite slow on a loaded runner.
  const harnessDir = path.join(root, "packages", "tests", "test");
  const unitLane = walk(harnessDir, (name) => name.endsWith(".test.js"))
    .map((file) => path.relative(harnessDir, file).split(path.sep).join("/"))
    .filter((rel) => !rel.startsWith("browser/") && rel !== "workspace-manifest.test.js");

  const long = /(?:setTimeout|\bsleep|\bdelay|page\.waitForTimeout)\s*\(\s*(?:\([^)]*\)\s*=>\s*)?[^,)]*,\s*([0-9][0-9_]{2,})\s*\)/g;
  const offenders = [];
  for (const rel of unitLane) {
    const source = fs.readFileSync(path.join(harnessDir, rel), "utf8");
    for (const match of source.matchAll(long)) {
      if (Number(match[1].replace(/_/g, "")) >= 1_000) offenders.push(`${rel}: ${match[1]}ms`);
    }
  }
  assert.deepEqual(offenders, [], "a minute-scale lease or timeout must be advanced on the fake clock");

  assert.ok(exists("packages", "tests", "src", "fake-clock.ts"), "the fake clock helper must exist");
  const users = unitLane.filter((rel) => fs.readFileSync(path.join(harnessDir, rel), "utf8").includes("fake-clock.ts"));
  assert.ok(users.length > 0, "the fake clock helper must be used by a lease or timeout test");
});

test("no test points an adapter profile at the checkout", () => {
  // Adapters write diagnostics beside their profile directory, so a profile of
  // "." leaves test debris inside the repository instead of a scratch root.
  const offenders = walk(path.join(root, "packages", "tests", "test"), (name) => name.endsWith(".test.js"))
    .map((file) => path.relative(root, file).split(path.sep).join("/"))
    .filter((rel) => /profileDir:\s*['"]\.['"]/.test(read(rel)));
  assert.deepEqual(offenders, [], "a checkout-relative adapter profile writes diagnostics into the repository");
});
