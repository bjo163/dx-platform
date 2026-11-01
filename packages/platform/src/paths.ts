import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getEnvCaseInsensitive } from "./command-launcher.js";

const APP_NAME = "wtagent";
const LEGACY_APP_NAME = "webagent";

type PathApi = typeof path.posix;

interface FormatHomePathOptions {
  platform?: NodeJS.Platform;
  homeDir?: string;
}

interface PlatformAppDataDirOptions {
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  homeDir: string;
}

export interface GetAppDataDirOptions extends Partial<PlatformAppDataDirOptions> {
  exists?: (target: string) => boolean;
}

export function formatHomePath(filePath: string, {
  platform = process.platform,
  homeDir = os.homedir(),
}: FormatHomePathOptions = {}) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  if (!pathApi.isAbsolute(filePath)) {
    return filePath;
  }
  const relative = pathApi.relative(homeDir, filePath);
  if (relative === "") {
    return "~";
  }
  if (relative === ".." || relative.startsWith(`..${pathApi.sep}`)
    || pathApi.isAbsolute(relative)) {
    return filePath;
  }
  return `~${pathApi.sep}${relative}`;
}

function platformAppDataDir(appName: string, {
  env,
  platform,
  homeDir,
}: PlatformAppDataDirOptions) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  if (platform === "darwin") {
    return pathApi.join(homeDir, "Library", "Application Support", appName);
  }

  if (platform === "win32") {
    const base = getEnvCaseInsensitive(env, "APPDATA")
      ?? pathApi.join(homeDir, "AppData", "Roaming");
    return pathApi.join(base, appName);
  }

  const base = getEnvCaseInsensitive(env, "XDG_DATA_HOME")
    ?? pathApi.join(homeDir, ".local", "share");
  return pathApi.join(base, appName);
}

function looksLikeLegacyDataDir(
  directory: string,
  exists: (target: string) => boolean,
  pathApi: PathApi,
) {
  return ["chrome-profile", "sessions", "tasks"]
    .some((entry) => exists(pathApi.join(directory, entry)));
}

export function getAppDataDir(appName: string = APP_NAME, {
  env = process.env,
  platform = process.platform,
  homeDir = os.homedir(),
  exists = existsSync,
}: GetAppDataDirOptions = {}) {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const configured = getEnvCaseInsensitive(env, "WTAGENT_HOME")
    ?? getEnvCaseInsensitive(env, "WEBAGENT_HOME");
  if (configured) {
    return pathApi.resolve(configured);
  }

  const current = platformAppDataDir(appName, { env, platform, homeDir });
  if (appName !== APP_NAME || exists(current)) {
    return current;
  }

  const legacy = platformAppDataDir(LEGACY_APP_NAME, {
    env,
    platform,
    homeDir,
  });
  return looksLikeLegacyDataDir(legacy, exists, pathApi) ? legacy : current;
}

export function getChromeProfileDir(appDataDir: string = getAppDataDir()) {
  return path.join(appDataDir, "chrome-profile");
}

// Resolves a named Chrome profile directory under the app data dir. The
// provider→basename mapping lives in the provider registry; this helper only
// joins the path so paths.js stays free of provider dependencies.
export function getProfileDir(appDataDir: string, basename: string) {
  return path.join(appDataDir, basename);
}

export function getTasksDir(appDataDir: string = getAppDataDir()) {
  return path.join(appDataDir, "tasks");
}

export function getSessionsDir(appDataDir: string = getAppDataDir()) {
  return path.join(appDataDir, "sessions");
}

export async function ensureDirectory(directoryPath: string) {
  await fs.mkdir(directoryPath, { recursive: true });
  return directoryPath;
}
