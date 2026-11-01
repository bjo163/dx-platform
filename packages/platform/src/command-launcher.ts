import fs from "node:fs";
import path from "node:path";

const WINDOWS_EXECUTABLE_EXTENSIONS = new Set([".exe", ".com"]);
const WINDOWS_BATCH_EXTENSIONS = new Set([".cmd", ".bat"]);
const DEFAULT_PATHEXT = [".COM", ".EXE", ".BAT", ".CMD"];
const CMD_META_CHARS = /([()\][%!^"`<>&|;, *?])/g;
const CMD_PROXY_SHIM = /(?:^|[\\/])(?:node_modules[\\/]\.bin[\\/][^\\/]+|npm|npx)\.cmd$/i;
const MAX_BATCH_INSPECTION_BYTES = 64 * 1024;

// Only the members these helpers actually call. `resolveLaunchPlan` accepts
// injected filesystem probes, so the contract stays structural instead of
// tying callers to a full `fs.Stats`.
interface FileStatLike {
  isFile(): boolean;
}

interface FsProbeOptions {
  existsSync: (target: string) => boolean;
  statSync: (target: string) => FileStatLike;
}

interface WindowsCandidateOptions extends FsProbeOptions {
  env: NodeJS.ProcessEnv;
}

export type LaunchPlanBridge = "direct" | "unresolved" | "cmd";

export interface ResolveLaunchPlanOptions extends Partial<FsProbeOptions> {
  program?: string;
  argv?: readonly unknown[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  readBatchPrefixImpl?: (scriptPath: string) => string;
}

export interface ResolvedLaunchPlan {
  command: string;
  args: string[];
  shell: boolean;
  logicalProgram: string;
  logicalArgv: string[];
  resolvedProgram: string;
  bridge: LaunchPlanBridge;
  usesCmdBridge?: boolean;
  windowsVerbatimArguments?: boolean;
}

export function getEnvCaseInsensitive(
  env: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  const direct = env[name];
  if (direct != null) {
    return direct;
  }
  const upperName = name.toUpperCase();
  for (const [key, value] of Object.entries(env)) {
    if (key.toUpperCase() === upperName) {
      return value;
    }
  }
  return undefined;
}

function hasWindowsPathIndicators(program: string) {
  return (
    program.startsWith(".")
    || program.includes("\\")
    || program.includes("/")
    || /^[a-zA-Z]:/.test(program)
    || program.startsWith("\\\\")
  );
}

function candidateIsFile(candidate: string | null, { existsSync, statSync }: FsProbeOptions) {
  if (!candidate || !existsSync(candidate)) {
    return false;
  }
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function getPathext(env: NodeJS.ProcessEnv) {
  const configured = getEnvCaseInsensitive(env, "PATHEXT");
  const values = (configured ? configured.split(";") : DEFAULT_PATHEXT)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (value.startsWith(".") ? value : `.${value}`))
    .map((value) => value.toLowerCase());
  const deduped: string[] = [];
  for (const value of values) {
    if (!deduped.includes(value)) {
      deduped.push(value);
    }
  }
  return deduped.length > 0 ? deduped : DEFAULT_PATHEXT.map((value) => value.toLowerCase());
}

function getWindowsSearchDirs(cwd: string, env: NodeJS.ProcessEnv) {
  const raw = getEnvCaseInsensitive(env, "PATH") ?? "";
  const values = raw
    .split(";")
    .map((value) => value.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
  return [cwd, ...values];
}

function expandWindowsCandidate(candidate: string, { env, existsSync, statSync }: WindowsCandidateOptions) {
  const extension = path.win32.extname(candidate).toLowerCase();
  if (extension) {
    return candidateIsFile(candidate, { existsSync, statSync }) ? candidate : null;
  }

  for (const ext of getPathext(env)) {
    const withExtension = `${candidate}${ext}`;
    if (candidateIsFile(withExtension, { existsSync, statSync })) {
      return withExtension;
    }
  }
  return null;
}

function resolveWindowsProgram(
  program: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  options: FsProbeOptions,
) {
  const windowsPath = path.win32;
  if (hasWindowsPathIndicators(program)) {
    const absolute = windowsPath.isAbsolute(program)
      ? program
      : windowsPath.resolve(cwd, program);
    return expandWindowsCandidate(windowsPath.normalize(absolute), { env, ...options });
  }

  for (const directory of getWindowsSearchDirs(cwd, env)) {
    const candidate = windowsPath.join(directory, program);
    const resolved = expandWindowsCandidate(candidate, { env, ...options });
    if (resolved) {
      return resolved;
    }
  }
  return null;
}

function assertNoNul(value: unknown, label: string) {
  if (String(value).includes("\0")) {
    throw new TypeError(`${label} cannot contain a NUL byte.`);
  }
}

function escapeCmdCommand(value: unknown) {
  return String(value).replace(CMD_META_CHARS, "^$1");
}

// cmd.exe and the Windows C runtime apply different quote/backslash rules.
// Encode one structured argv item for both layers, then escape CMD meta
// characters. Proxy shims such as npm.cmd and node_modules/.bin/*.cmd expand
// `%*` through a second CMD parse, so their meta characters need one more
// escape pass. This is intentionally centralized here; callers never build a
// shell string themselves.
function escapeCmdArgument(
  value: unknown,
  { doubleEscapeMetaChars = false }: { doubleEscapeMetaChars?: boolean } = {},
) {
  let argument = String(value);
  argument = argument.replace(/(?=(\\+?)?)\1"/g, "$1$1\\\"");
  argument = argument.replace(/(?=(\\+?)?)\1$/g, "$1$1");
  argument = `"${argument}"`;
  argument = argument.replace(CMD_META_CHARS, "^$1");
  if (doubleEscapeMetaChars) {
    argument = argument.replace(CMD_META_CHARS, "^$1");
  }
  return argument;
}

function readBatchPrefix(scriptPath: string) {
  const handle = fs.openSync(scriptPath, "r");
  try {
    const buffer = Buffer.alloc(MAX_BATCH_INSPECTION_BYTES);
    const bytesRead = fs.readSync(
      handle,
      buffer,
      0,
      buffer.length,
      0,
    );
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    fs.closeSync(handle);
  }
}

function batchNeedsDoubleEscape(
  scriptPath: string,
  readBatchPrefixImpl: (scriptPath: string) => string = readBatchPrefix,
) {
  if (CMD_PROXY_SHIM.test(scriptPath)) {
    return true;
  }
  try {
    return readBatchPrefixImpl(scriptPath).includes("%*");
  } catch {
    return false;
  }
}

function buildBatchCommand(
  scriptPath: string,
  argv: readonly unknown[],
  {
    doubleEscapeMetaChars = CMD_PROXY_SHIM.test(scriptPath),
  }: { doubleEscapeMetaChars?: boolean } = {},
) {
  const parts = [
    escapeCmdCommand(scriptPath),
    ...argv.map((value) => escapeCmdArgument(value, {
      doubleEscapeMetaChars,
    })),
  ];
  // The outer quote pair is required by cmd.exe /s /c semantics. Spawn uses
  // windowsVerbatimArguments for this already-encoded command line.
  return `"${parts.join(" ")}"`;
}

export function resolveLaunchPlan({
  program,
  argv = [],
  cwd = process.cwd(),
  env = process.env,
  platform = process.platform,
  existsSync = fs.existsSync,
  statSync = fs.statSync,
  readBatchPrefixImpl = readBatchPrefix,
}: ResolveLaunchPlanOptions = {}): ResolvedLaunchPlan {
  const logicalProgram = String(program ?? "");
  const logicalArgv = Array.isArray(argv) ? argv.map((value) => String(value)) : [];
  if (!logicalProgram) {
    throw new TypeError("program cannot be empty.");
  }
  assertNoNul(logicalProgram, "program");
  logicalArgv.forEach((value, index) => assertNoNul(value, `argv[${index}]`));

  if (platform !== "win32") {
    return {
      command: logicalProgram,
      args: logicalArgv,
      shell: false,
      logicalProgram,
      logicalArgv,
      resolvedProgram: logicalProgram,
      bridge: "direct",
    };
  }

  const resolvedProgram = resolveWindowsProgram(logicalProgram, cwd, env, {
    existsSync,
    statSync,
  }) ?? logicalProgram;
  const extension = path.win32.extname(resolvedProgram).toLowerCase();
  if (!WINDOWS_BATCH_EXTENSIONS.has(extension)) {
    return {
      command: resolvedProgram,
      args: logicalArgv,
      shell: false,
      logicalProgram,
      logicalArgv,
      resolvedProgram,
      bridge: WINDOWS_EXECUTABLE_EXTENSIONS.has(extension) ? "direct" : "unresolved",
    };
  }

  const comSpec = getEnvCaseInsensitive(env, "ComSpec")
    || getEnvCaseInsensitive(env, "COMSPEC")
    || "cmd.exe";

  const doubleEscapeMetaChars = batchNeedsDoubleEscape(
    resolvedProgram,
    readBatchPrefixImpl,
  );

  return {
    command: comSpec,
    args: [
      "/d",
      "/s",
      "/c",
      buildBatchCommand(resolvedProgram, logicalArgv, {
        doubleEscapeMetaChars,
      }),
    ],
    shell: false,
    logicalProgram,
    logicalArgv,
    resolvedProgram,
    bridge: "cmd",
    usesCmdBridge: true,
    windowsVerbatimArguments: true,
  };
}

export const __internal = {
  batchNeedsDoubleEscape,
  buildBatchCommand,
  escapeCmdArgument,
  escapeCmdCommand,
  expandWindowsCandidate,
  getEnvCaseInsensitive,
  getPathext,
  getWindowsSearchDirs,
  hasWindowsPathIndicators,
  readBatchPrefix,
  resolveWindowsProgram,
};
