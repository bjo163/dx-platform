import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { buildBootstrapPrompt, buildResumePrompt } from "@neuralforge/protocol/prompt-builder";
import { extractMarkedBlocks, wrapSystemPrompt } from "@neuralforge/protocol/markers";
import { assertWindowsSafeName, isPathInside } from "@neuralforge/policy/path-guard";
import { cliManifestPath } from "../src/layout.js";

// Angle brackets and CDATA markers are built by concatenation so this file
// never contains a literal protocol tag: the XML protocol travels through
// message text, and a bare tag here would be read as markup by whatever
// transports these sources.
const open = (name) => "<" + name + ">";
const close = (name) => "</" + name + ">";
const cdataOpen = "<!" + "[CDATA[";
const cdataClose = "]" + "]>";
// A literal ]]> inside CDATA is escaped by ending the section one bracket
// early and reopening: "]]>" -> "]]]]><![CDATA[>".
const cdataTerminator = "]]" + cdataClose + cdataOpen + ">";
const fence = "```" + "xml";

function splitCdata(value) {
  return value.replaceAll(cdataClose, cdataTerminator);
}

const tools = [
  { name: "fs.read", description: "Read a file.", inputDescription: open("path") + "file.txt" + close("path") },
  { name: "fs.write", description: ["Write a file.", "Creates parents when needed."], inputDescription: open("path") + "file.txt" + close("path") },
];

function countFenceLines(text, expected) {
  return text.split("\n").filter((line) => line === expected).length;
}

function contains(text, needle) {
  return text.includes(needle);
}

test("bootstrap prompt keeps every worked xml example inside its own fence", async () => {
  const { developer } = buildBootstrapPrompt({ task: "hello", projectRoot: "/workspace", tools });

  // One protocol skeleton + two worked examples. Losing any of these was the
  // silent degradation that made the shipped prompt worse than the JS original.
  assert.equal(countFenceLines(developer, fence), 3, "expected exactly three ```xml fences");
  assert.equal(countFenceLines(developer, "```"), 3, "every xml fence must be closed");

  for (const needle of [
    open("agent_response"),
    close("agent_response"),
    open("tool_call name=\"fs.write\""),
    "<args>" + open("path") + "hello.txt" + close("path"),
    cdataOpen + "hello" + cdataClose,
    "<message>The capital of France is Paris.</message>",
  ]) {
    assert.ok(contains(developer, needle), `bootstrap prompt lost ${needle}`);
  }
});

test("bootstrap prompt keeps the tool catalog headings and multi-line descriptions", async () => {
  const { developer } = buildBootstrapPrompt({ task: "hello", projectRoot: "/workspace", tools });

  assert.ok(contains(developer, "## Available tools"), "missing the tools heading");
  assert.ok(contains(developer, "## Available tools\n### fs.read"), "tools catalog must start right after the heading");
  // Array descriptions stay line-broken; Array#join would comma-join them.
  assert.ok(contains(developer, "### fs.write\nWrite a file.\nCreates parents when needed."), "description lines were joined");
  assert.ok(!contains(developer, "Write a file.,Creates parents when needed."), "description was comma-joined");
});

test("bootstrap prompt switches the image contract on and off", async () => {
  const plain = buildBootstrapPrompt({ task: "t", projectRoot: "/workspace", tools }).developer;
  const native = buildBootstrapPrompt({ task: "t", projectRoot: "/workspace", tools, nativeImages: true }).developer;

  assert.ok(!contains(plain, "## Native images"), "native image section leaked into the plain prompt");
  assert.ok(contains(plain, "Every reply must contain exactly one"), "plain prompt lost its fence wording");
  assert.ok(contains(native, "## Native images"), "missing the native image section");
  assert.ok(contains(native, "Every text reply must contain exactly one"), "native prompt lost its fence wording");
  assert.ok(!contains(native, "Every reply must contain exactly one"), "native prompt kept the plain wording");
});

test("bootstrap web message wraps the scaffold and appends the user task", async () => {
  const { web, developer, user } = buildBootstrapPrompt({ task: "do the thing", projectRoot: "/workspace", tools });

  assert.equal(user, "do the thing");
  assert.equal(web, `${wrapSystemPrompt(developer)}\n\n## User task\ndo the thing`);
});

test("resume prompt cdata-wraps context and splits embedded cdata terminators", async () => {
  const state = {
    sessionId: "sess-1",
    projectRoot: "Z:\\project\\weird",
    task: "first ]]> request",
  };
  const { developer } = buildResumePrompt({ instruction: "keep ]]> going", state, tools });

  for (const [tag, value] of [
    ["project_root", state.projectRoot],
    ["initial_request", state.task],
    ["latest_instruction", "keep ]]> going"],
  ]) {
    const split = splitCdata(value);
    assert.ok(contains(developer, `${open(tag)}${cdataOpen}${split}${cdataClose}${close(tag)}`), `${tag} was not CDATA-wrapped`);
  }

  assert.ok(contains(developer, open("resume_context")), "missing the resume context block");
  assert.ok(contains(developer, open("session_id") + "sess-1" + close("session_id")), "session id lost");
  assert.ok(contains(developer, "Available tools:\n### fs.read"), "resume tools catalog drifted");
});

test("resume prompt falls back when the instruction is blank", async () => {
  const state = { sessionId: "s", projectRoot: "/workspace", task: "original" };
  const blank = buildResumePrompt({ instruction: "   ", state, tools });
  const withInstruction = buildResumePrompt({ instruction: "next step", state, tools });

  assert.match(blank.user, /^Continue the interrupted run based on/);
  assert.ok(contains(blank.developer, "Continue the interrupted run: if it needs files"));
  assert.equal(withInstruction.user, "next step");
  assert.ok(contains(withInstruction.developer, "This is the user's next message in the same open conversation."));
});

test("extractMarkedBlocks returns every adjacent block in order", async () => {
  const text = `lead ${wrapSystemPrompt("first")} middle ${wrapSystemPrompt("second")} tail`;
  const blocks = extractMarkedBlocks(text, "agent_protocol");

  assert.equal(blocks.length, 2, "adjacent markers must both be captured");
  assert.deepEqual(blocks, ["first", "second"]);
  assert.deepEqual(extractMarkedBlocks("no markers here", "agent_protocol"), []);
});

test("windows path guard still rejects the full illegal character class", async () => {
  for (const name of ["a<b.txt", "a>b.txt", "sub\\a:b.txt", 'a"b.txt', "a|b.txt", "a?b.txt", "a*b.txt", "a\tb.txt", "a\nb.txt"]) {
    assert.throws(
      () => assertWindowsSafeName(name, { platform: "win32" }),
      /illegal on Windows/,
      `character class lost ${JSON.stringify(name)}`,
    );
  }
  // A leading "X:" is consumed as a drive letter before the leaf check, so the
  // colon only reaches the illegal-character class inside a component.
  assert.doesNotThrow(() => assertWindowsSafeName("c:\\dir\\file.txt", { platform: "win32" }));
  assert.throws(() => assertWindowsSafeName("sub\\CON.anything.txt", { platform: "win32" }), /reserved Windows device name/);
  assert.throws(() => assertWindowsSafeName("trailing .", { platform: "win32" }), /space or period/);
  assert.doesNotThrow(() => assertWindowsSafeName("dir\\file.txt", { platform: "win32" }));
  assert.doesNotThrow(() => assertWindowsSafeName("weird:name", { platform: "linux" }), "non-windows must stay a no-op");
});

test("windows containment keeps the drive root and strips trailing separators", async () => {
  assert.equal(isPathInside("C:\\", "C:\\Windows\\System32", { platform: "win32" }), true, "drive root must stay absolute");
  assert.equal(isPathInside("C:\\", "C:\\", { platform: "win32" }), true);
  assert.equal(isPathInside("C:\\project\\", "C:\\project\\src\\a.ts", { platform: "win32" }), true, "trailing separator not normalized");
  assert.equal(isPathInside("C:\\project\\", "C:\\other", { platform: "win32" }), false);
  assert.equal(isPathInside("C:\\project", "C:\\project2\\a.ts", { platform: "win32" }), false, "sibling prefix must not match");
  assert.equal(isPathInside("C:\\project", "..\\escape", { platform: "win32" }), false);
  assert.equal(isPathInside("/srv/app", "/srv/app/src/a.ts"), true);
  assert.equal(isPathInside("/srv/app", "/srv/other"), false);
});

test("the published cli manifest is the single neuralforge executable", async () => {
  const manifest = JSON.parse(await fs.readFile(cliManifestPath, "utf8"));

  assert.equal(manifest.name, "neuralforge");
  assert.deepEqual(manifest.bin, { neuralforge: "./dist/main.js" }, "cli must expose exactly one bin");
  assert.equal(manifest.type, "module");
  assert.ok(manifest.engines?.node, "engines.node is required so the CLI cannot be installed on an unsupported runtime");
  assert.match(manifest.engines.node, /20\.17\.0/);
  assert.ok(manifest.engines?.pnpm, "engines.pnpm is required for workspace installs");
});
