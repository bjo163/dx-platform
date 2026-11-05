#!/usr/bin/env node
/**
 * Brand Consistency Check
 * Scans for legacy branding references in the codebase
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

const patterns = [
  { pattern: "wtagent", type: "lowercase", severity: "error" },
  { pattern: "WTAgent", type: "mixed-case", severity: "error" },
  { pattern: "WTAGENT_", type: "env-var", severity: "warning" },
  { pattern: "neuralforge", type: "lowercase", severity: "error" },
  { pattern: "NeuralForge", type: "brand-old", severity: "error" },
  { pattern: "NEURALFORGE_", type: "env-var-old", severity: "warning" },
];

console.log("🔍 DX-Platform Brand Consistency Check\n");

let issuesFound = 0;

for (const { pattern, type, severity } of patterns) {
  try {
    const result = execSync(`grep -r "${pattern}" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude="*.tsbuildinfo" 2>/dev/null`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    if (result) {
      const lines = result.split("\n").filter((line) => !line.includes("brand-check.mjs"));
      if (lines.length > 0) {
        console.log(`⚠️  [${severity.toUpperCase()}] Found "${pattern}" (${type}):`);
        lines.slice(0, 5).forEach((line) => console.log(`   ${line}`));
        if (lines.length > 5) console.log(`   ... and ${lines.length - 5} more\n`);
        issuesFound += lines.length;
      }
    }
  } catch {
    // grep found nothing
  }
}

if (issuesFound === 0) {
  console.log("✅ No legacy branding found. All references updated to DX-Platform.\n");
  process.exit(0);
} else {
  console.log(`\n❌ Found ${issuesFound} branding inconsistencies. Please review and update.\n`);
  process.exit(1);
}
