import { createHash } from "node:crypto";

// DOM-drift evidence, kept separate from the adapter so it can be exercised
// without a browser. `readDomStructure` runs inside the page (Playwright
// serializes its source), so it must stay self-contained and take its root as
// an argument; everything here else is Node-side analysis of what it returned.

export interface DomStructure {
  elements: number;
  tags: Record<string, number>;
  roles: string[];
  ids: string[];
  dataAttributes: string[];
  testIds: string[];
}

export interface DomDriftReport {
  changed: boolean;
  elements: { before: number; after: number; delta: number };
  added: { roles: string[]; ids: string[]; dataAttributes: string[]; testIds: string[] };
  removed: { roles: string[]; ids: string[]; dataAttributes: string[]; testIds: string[] };
  tagChanges: Array<{ tag: string; before: number; after: number }>;
}

interface StructureAttribute {
  name: string;
  value: string | null;
}

export function readDomStructure(
  root: { querySelectorAll(selector: string): ArrayLike<any> } = document as any,
): DomStructure {
  // Generated identifiers churn every render, so every token is collapsed to a
  // shape: `message-3` and `message-41` are the same structural element.
  const normalize = (value: string | null | undefined) => String(value ?? "")
    .trim().toLowerCase().replace(/\d+/g, "#").slice(0, 64);

  const tags: Record<string, number> = {};
  const roles = new Set<string>();
  const ids = new Set<string>();
  const dataAttributes = new Set<string>();
  const testIds = new Set<string>();
  const elements = root.querySelectorAll("*");

  for (const element of Array.from(elements)) {
    const tag = normalize(element.tagName) || "?";
    tags[tag] = (tags[tag] ?? 0) + 1;
    const nodes = Array.from((element.attributes ?? []) as ArrayLike<StructureAttribute>);
    for (const attribute of nodes) {
      const name = attribute.name;
      if (name === "role") {
        const value = normalize(attribute.value);
        if (value) roles.add(value);
      } else if (name === "id") {
        const value = normalize(attribute.value);
        if (value) ids.add(value);
      } else if (name === "data-testid") {
        const value = normalize(attribute.value);
        if (value) testIds.add(value);
      } else if (name.startsWith("data-")) {
        dataAttributes.add(normalize(name));
      }
    }
  }

  return {
    elements: elements.length,
    tags,
    roles: [...roles],
    ids: [...ids],
    dataAttributes: [...dataAttributes],
    testIds: [...testIds],
  };
}

function canonical(structure: DomStructure): string {
  const sortedCounts = Object.entries(structure.tags ?? {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([tag, count]) => `${tag}:${count}`);
  const sorted = (values: any) => [...(values ?? [])].sort();
  return JSON.stringify({
    elements: structure.elements ?? 0,
    tags: sortedCounts,
    roles: sorted(structure.roles),
    ids: sorted(structure.ids),
    dataAttributes: sorted(structure.dataAttributes),
    testIds: sorted(structure.testIds),
  });
}

export function hashDomStructure(structure: DomStructure): string {
  return createHash("sha256").update(canonical(structure)).digest("hex");
}

const difference = (before: string[], after: string[]) => {
  const previous = new Set(before ?? []);
  const current = new Set(after ?? []);
  return {
    added: [...current].filter((value) => !previous.has(value)).sort(),
    removed: [...previous].filter((value) => !current.has(value)).sort(),
  };
};

export function diffDomStructures(
  before: DomStructure,
  after: DomStructure,
): DomDriftReport {
  const roles = difference(before.roles, after.roles);
  const ids = difference(before.ids, after.ids);
  const dataAttributes = difference(before.dataAttributes, after.dataAttributes);
  const testIds = difference(before.testIds, after.testIds);

  const counts = new Set([
    ...Object.keys(before.tags ?? {}),
    ...Object.keys(after.tags ?? {}),
  ]);
  const tagChanges = [...counts]
    .map((tag) => ({
      tag,
      before: before.tags?.[tag] ?? 0,
      after: after.tags?.[tag] ?? 0,
    }))
    .filter((change) => change.before !== change.after)
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
    .slice(0, 12);

  const changed = tagChanges.length > 0
    || roles.added.length + roles.removed.length > 0
    || ids.added.length + ids.removed.length > 0
    || dataAttributes.added.length + dataAttributes.removed.length > 0
    || testIds.added.length + testIds.removed.length > 0;

  return {
    changed,
    elements: {
      before: before.elements ?? 0,
      after: after.elements ?? 0,
      delta: (after.elements ?? 0) - (before.elements ?? 0),
    },
    added: { roles: roles.added, ids: ids.added, dataAttributes: dataAttributes.added, testIds: testIds.added },
    removed: { roles: roles.removed, ids: ids.removed, dataAttributes: dataAttributes.removed, testIds: testIds.removed },
    tagChanges,
  };
}
