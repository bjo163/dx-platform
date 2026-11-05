import {
  createWebAdapter,
  getProviderProfileDir,
  resolveProvider,
} from "@dx-platform/browser";
import { AgentRuntime } from "@dx-platform/runtime";
import { PolicyEngine } from "@dx-platform/policy";
import { createDefaultToolRegistry } from "@dx-platform/tools";
import { ProcessManager } from "@dx-platform/tools";
import { getAppDataDir } from "@dx-platform/platform";
import { resolveLimits } from "@dx-platform/shared";
import type { Limits } from "@dx-platform/shared";
import type { JobRecord } from "./job-store.js";

export interface HeadlessRuntimeConfig {
  session: any;
  record: Pick<JobRecord, "allowedTools" | "provider" | "jobId">;
  homeDir?: string;
  profileDir?: string;
  chromePath?: string | null;
  limits?: Limits;
  onEvent?: (event: any) => unknown;
  // Tests inject a fake adapter so the runner can be exercised without Chrome.
  createAdapter?: (options: Record<string, any>) => any;
}

export interface HeadlessRuntime {
  runtime: AgentRuntime;
  adapter: any;
  limits: Limits;
  allowedTools: Set<string>;
}

// The interactive CLI prompts for approvals and model selection; a background
// job has nobody to answer. The caller's tool allowlist is the entire consent
// surface, so anything the policy would ask a human about is denied unless the
// job was created with that tool granted.
export function createHeadlessRuntime({
  session,
  record,
  homeDir = getAppDataDir(),
  profileDir,
  chromePath = null,
  limits,
  onEvent,
  createAdapter = createWebAdapter,
}: HeadlessRuntimeConfig): HeadlessRuntime {
  const provider = resolveProvider(record.provider);
  const resolvedLimits = limits ?? resolveLimits();
  const allowedTools = new Set(record.allowedTools);
  const processManager = new ProcessManager();
  const adapter = createAdapter({
    provider,
    profileDir: profileDir ?? getProviderProfileDir(homeDir, provider.id),
    chromePath,
    // A minimized window is the only sane default for an unattended run.
    minimized: true,
    // ESC belongs to a terminal that is not attached to a background job.
    cancelOnEsc: false,
  });

  const runtime = new AgentRuntime({
    adapter,
    registry: createDefaultToolRegistry({ processManager, limits: resolvedLimits }),
    policy: new PolicyEngine(),
    session,
    limits: resolvedLimits,
    approval: async ({ toolCall }: any) => allowedTools.has(toolCall.name),
    onEvent: onEvent ? (event: any) => onEvent(event) : undefined,
  });

  return { runtime, adapter, limits: resolvedLimits, allowedTools };
}
