import test from "../../src/shim.ts";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  BaseWebAdapter,
  diffDomStructures,
  hashDomStructure,
  readDomStructure,
} from "@neuralforge/browser";

function element(tag, attributes = {}) {
  return {
    tagName: tag,
    attributes: Object.entries(attributes).map(([name, value]) => ({ name, value: String(value) })),
  };
}

function rootOf(elements) {
  return { querySelectorAll: () => elements };
}

const WORKING = [
  element("textarea", { id: "composer", role: "textbox" }),
  element("button", { role: "button", "data-testid": "send-button" }),
  element("div", { "data-message-author-role": "user", "data-chatgpt-search-unit-key": "k" }),
];

test("a re-render with fresh generated identifiers is not drift", () => {
  const before = readDomStructure(rootOf([
    element("div", { id: "message-1" }),
    element("div", { id: "message-2" }),
  ]));
  const after = readDomStructure(rootOf([
    element("div", { id: "message-77" }),
    element("div", { id: "message-78" }),
  ]));

  assert.deepEqual(after.ids, ["message-#"]);
  assert.equal(hashDomStructure(before), hashDomStructure(after));
  assert.equal(diffDomStructures(before, after).changed, false);
});

test("a redesign reports the roles, test ids and tags it swapped", () => {
  const before = readDomStructure(rootOf(WORKING));
  const after = readDomStructure(rootOf([
    element("textarea", { id: "composer", role: "textbox" }),
    // The provider renamed its control and moved it off a button.
    element("div", { role: "submit", "data-testid": "composer-submit", "aria-label": "send" }),
    element("article", { "data-message-author-role": "user" }),
  ]));

  const drift = diffDomStructures(before, after);
  assert.equal(drift.changed, true);
  assert.notEqual(hashDomStructure(before), hashDomStructure(after));
  assert.deepEqual(drift.added.roles, ["submit"]);
  assert.deepEqual(drift.removed.roles, ["button"]);
  assert.deepEqual(drift.added.testIds, ["composer-submit"]);
  assert.deepEqual(drift.removed.testIds, ["send-button"]);
  assert.deepEqual(drift.removed.dataAttributes, ["data-chatgpt-search-unit-key"]);
  assert.ok(drift.tagChanges.some((change) => change.tag === "button" && change.after === 0));
  assert.equal(drift.elements.before, drift.elements.after);
});

test("an element without attributes still shapes the page", () => {
  const structure = readDomStructure(rootOf([{ tagName: "p" }, element("br")]));

  assert.equal(structure.elements, 2);
  assert.equal(structure.tags.br, 1);
  assert.deepEqual(structure.roles, []);
});

test("the adapter baselines a working page and detects when it stops matching", async (t) => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "neuralforge-drift-"));
  t.after(() => fs.rm(base, { recursive: true, force: true }));

  let nodes = WORKING;
  const adapter = new BaseWebAdapter({ profileDir: path.join(base, "profile"), baseUrl: "https://example.test" });
  // A provider that owns locators owns the structural report; the base class is
  // deliberately inert.
  adapter.hasStructuralDiagnostics = () => true;
  adapter.page = {
    url: () => "https://example.test/chat/1",
    evaluate: async (reader) => reader(rootOf(nodes)),
    reload: async () => {},
    waitForTimeout: async () => {},
  };

  const baseline = await adapter.captureDomBaseline();
  assert.equal(baseline.hash.length, 64);
  assert.equal(baseline.url, "https://example.test/chat/1");
  assert.equal(await adapter.detectDomDrift(), null, "an unchanged page must not look like drift");

  nodes = [element("div", { id: "composer", role: "textbox" })];
  const drift = await adapter.detectDomDrift();
  assert.equal(drift.changed, true);
  assert.ok(drift.tagChanges.some((change) => change.tag === "textarea"));

  const written = await adapter.writeDiagnostics("dom-drift", { domDrift: drift });
  assert.ok(written?.filename, "a provider with structural diagnostics must persist the failure");
  const report = JSON.parse(await fs.readFile(written.filename, "utf8"));
  assert.equal(report.label, "dom-drift");
  assert.equal(report.domLayout.hash, baseline.hash.slice(0, 12));
  assert.equal(report.domDrift.changed, true);
  assert.equal(report.domDrift.removed.roles[0], "button");
});

test("a page that never worked has no drift to report", async (t) => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "neuralforge-drift-"));
  t.after(() => fs.rm(base, { recursive: true, force: true }));

  const adapter = new BaseWebAdapter({ profileDir: path.join(base, "profile"), baseUrl: "https://example.test" });
  adapter.page = {
    url: () => "https://example.test/chat/1",
    evaluate: async (reader) => reader(rootOf(WORKING)),
  };

  assert.equal(await adapter.detectDomDrift(), null, "drift needs a baseline to compare against");
  assert.equal(adapter.lastDomDrift, null);
});

test("a dead page never turns a drift check into a second failure", async (t) => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "neuralforge-drift-"));
  t.after(() => fs.rm(base, { recursive: true, force: true }));

  const adapter = new BaseWebAdapter({ profileDir: path.join(base, "profile"), baseUrl: "https://example.test" });
  adapter.page = {
    url: () => "https://example.test/chat/1",
    evaluate: async () => { throw new Error("Target page, context or browser has been closed"); },
  };

  assert.equal(await adapter.captureDomBaseline(), null);
  assert.equal(await adapter.detectDomDrift(), null);
});
