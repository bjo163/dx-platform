// Platform and path types.

export type Platform = "win32" | "darwin" | "linux" | "other";

export interface PathInfo {
  inside: boolean;
  path: string;
  resolved: string;
}

export interface LaunchPlan {
  command: string;
  args: string[];
  env: Record<string, string>;
  shell: boolean;
  windowsHide: boolean;
}

export interface ChromeDiscoveryOptions {
  env?: Record<string, string>;
  platform?: Platform;
  execExists?: ((exe: string) => boolean) | null;
}

export interface AppPaths {
  appDataDir: string;
  sessionsDir: string;
  tasksDir: string;
  chromeProfileDir: string;
}

export interface DiagnosticEntry {
  stage: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface WindowsFixtures {
  echoArgvBat: string;
  echoArgvCmd: string;
  packageSmokeDir: string;
}
