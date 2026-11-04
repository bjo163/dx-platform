import path from "node:path";
import type { AgentToolCall, PolicyContext, PolicyDecision } from "@neuralforge/types";
import type { ApprovalStore } from "./approval-store.js";
import { resolveToolPath } from "./path-guard.js";

const PATH_FIELDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "fs.list": ["path"],
  "fs.read": ["path"],
  "fs.write": ["path"],
  "fs.edit": ["path"],
  "fs.search": ["path"],
  "terminal.exec": ["cwd"],
  "process.start": ["cwd"],
  "image.generate": ["output_path", "reference_images"],
});

const PRIVILEGED_PROGRAMS = new Set(["sudo", "su", "doas", "runas"]);
const DESTRUCTIVE_PROGRAMS = new Set([
  "rm",
  "rmdir",
  "del",
  "erase",
  "remove-item",
]);

const POSIX_SHELLS = new Set([
  "sh",
  "bash",
  "dash",
  "zsh",
  "ksh",
  "fish",
  "csh",
  "tcsh",
]);

const GIT_OPTIONS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--super-prefix",
  "--config-env",
  "--exec-path",
]);

function executableBasename(value: unknown): string {
  const normalized = String(value ?? "").trim().replaceAll("\\", "/");
  const basename = path.posix.basename(normalized).toLowerCase();
  return basename.replace(/\.(?:exe|cmd|bat|com)$/i, "");
}

function hasShortOption(token: string, option: string): boolean {
  return /^-[^-]+$/.test(token) && token.slice(1).includes(option);
}

function usesInlineShellCommand(program: string, argv: readonly string[]): boolean {
  if (POSIX_SHELLS.has(program)) {
    return argv.some((value) => {
      const token = value.toLowerCase();
      return token === "--command" || hasShortOption(token, "c");
    });
  }

  if (program === "cmd") {
    return argv.some((value) => value.toLowerCase() === "/c");
  }

  if (program === "powershell" || program === "pwsh") {
    return argv.some((value) => {
      const token = value.toLowerCase();
      return token === "-c"
        || token === "-command"
        || token === "-encodedcommand"
        || token === "-enc";
    });
  }

  return false;
}

function usesInlineInterpreterCode(program: string, argv: readonly string[]): boolean {
  const lowerArgv = argv.map((value) => value.toLowerCase());

  if (/^(?:python|pypy)(?:\d+(?:\.\d+)*)?$/.test(program)) {
    return lowerArgv.includes("-c");
  }
  if (program === "node" || program === "deno" || program === "bun") {
    return lowerArgv.some((value) => value === "-e" || value === "--eval");
  }
  if (program === "ruby" || program === "perl") {
    return lowerArgv.some((value) => hasShortOption(value, "e"));
  }
  if (program === "php") {
    return lowerArgv.some((value) => hasShortOption(value, "r"));
  }

  return false;
}

function gitSubcommand(argv: readonly string[]): string | null {
  for (let index = 0; index < argv.length;) {
    const token = argv[index];
    const lower = token.toLowerCase();

    if (token === "--") {
      return argv[index + 1]?.toLowerCase() ?? null;
    }
    if (!token.startsWith("-") || token === "-") {
      return lower;
    }

    if (GIT_OPTIONS_WITH_VALUE.has(token)) {
      index += 2;
      continue;
    }
    if (
      (token.startsWith("-C") && token.length > 2)
      || (token.startsWith("-c") && token.length > 2)
      || [...GIT_OPTIONS_WITH_VALUE]
        .filter((option) => option.startsWith("--"))
        .some((option) => lower.startsWith(`${option}=`))
    ) {
      index += 1;
      continue;
    }

    index += 1;
  }

  return null;
}

function unwrapEnv(
  argv: readonly string[],
  reasons: string[],
): { program: string; argv: string[] } | null {
  let index = 0;

  while (index < argv.length) {
    const token = argv[index];
    const lower = token.toLowerCase();

    if (token === "--") {
      index += 1;
      break;
    }
    if (
      token === "-S"
      || lower === "--split-string"
      || lower.startsWith("--split-string=")
    ) {
      reasons.push("environment wrapper with an inline command string");
      return null;
    }
    if (
      token === "-u"
      || lower === "--unset"
      || token === "-C"
      || lower === "--chdir"
    ) {
      index += 2;
      continue;
    }
    if (
      lower.startsWith("--unset=")
      || lower.startsWith("--chdir=")
      || token.startsWith("-")
    ) {
      index += 1;
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token)) {
      index += 1;
      continue;
    }
    break;
  }

  if (index >= argv.length) {
    return null;
  }

  return {
    program: argv[index],
    argv: argv.slice(index + 1),
  };
}

function analyzeExecutable(
  rawProgram: unknown,
  rawArgv: readonly unknown[],
  reasons: string[],
  depth = 0,
): void {
  if (depth > 4) {
    reasons.push("excessively nested command wrappers");
    return;
  }

  const program = executableBasename(rawProgram);
  const argv = rawArgv.map((value) => String(value));

  if (program === "env") {
    const unwrapped = unwrapEnv(argv, reasons);
    if (unwrapped) {
      analyzeExecutable(unwrapped.program, unwrapped.argv, reasons, depth + 1);
    }
    return;
  }

  if (PRIVILEGED_PROGRAMS.has(program)) {
    reasons.push(`privilege escalation through ${program}`);
  }
  if (DESTRUCTIVE_PROGRAMS.has(program)) {
    reasons.push(`destructive command ${program}`);
  }
  if (usesInlineShellCommand(program, argv)) {
    reasons.push(`inline shell command through ${program}`);
  }
  if (usesInlineInterpreterCode(program, argv)) {
    reasons.push(`inline interpreter code through ${program}`);
  }
  if (program === "git" && gitSubcommand(argv) === "push") {
    reasons.push("pushing code to a remote");
  }
  if (
    (program === "npm" || program === "pnpm" || program === "yarn")
    && argv.some((value) => value.toLowerCase() === "publish")
  ) {
    reasons.push("publishing a package");
  }
}

function commandReasons(name: string, args: Record<string, unknown>): string[] {
  if (name !== "terminal.exec" && name !== "process.start") {
    return [];
  }

  const reasons: string[] = [];
  const argv = Array.isArray(args.argv)
    ? args.argv.map((value) => String(value))
    : [];

  analyzeExecutable(args.program, argv, reasons);

  if (
    argv.some((value) => /(^|[-_:])(deploy|release|publish)([-_:]|$)/i.test(value))
  ) {
    reasons.push("deployment or release command");
  }
  if (args.inherit_sensitive_env === true) {
    reasons.push("inheriting sensitive environment variables");
  }

  return [...new Set(reasons)];
}

export class PolicyEngine {
  store: ApprovalStore | null;

  constructor({ store = null }: { store?: ApprovalStore | null } = {}) {
    this.store = store;
  }

  async evaluate(
    toolCall: AgentToolCall,
    context: PolicyContext,
  ): Promise<PolicyDecision> {
    await this.store?.ensureLoaded();
    if (this.store?.isAlwaysAllowed(toolCall.name)) {
      // The user explicitly opted to skip confirmation for this tool (or for
      // everything). Outside-project paths are granted too — that is the point
      // of always allowing a tool.
      return {
        action: "allow",
        reasons: [],
        grants: { allowOutside: true },
      };
    }

    const args = toolCall.args ?? {};
    const reasons = commandReasons(toolCall.name, args);
    let allowOutside = false;

    for (const field of PATH_FIELDS[toolCall.name] ?? []) {
      const values: unknown[] = Array.isArray(args[field])
        ? (args[field] as unknown[])
        : [args[field] || "."];
      for (const rawPath of values) {
        const resolved = await resolveToolPath(context.projectRoot, String(rawPath ?? ""));
        if (!resolved.inside) {
          reasons.push(`${field} is outside the selected project: ${resolved.path}`);
          allowOutside = true;
        }
      }
    }

    if (reasons.length > 0) {
      return {
        action: "confirm",
        reasons,
        grants: { allowOutside },
      };
    }

    return {
      action: "allow",
      reasons: [],
      grants: { allowOutside: false },
    };
  }
}
