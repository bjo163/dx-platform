// What an agent may do, what a model can do, and whether a provider is
// currently reachable. All three are data so the planner can diff them and the
// UI can render them without special-casing code paths.

import {
  invalid,
  isPlainObject,
  requireBoolean,
  requireInt,
  requireOneOf,
  requireString,
  requireStringArray,
  requireTimestamp,
  valid,
  type IssueSink,
  type ValidationResult,
} from "./validation.js";

export const CONTENT_MODES = ["text", "image", "audio", "file"] as const;

export type ContentMode = (typeof CONTENT_MODES)[number];

export interface AgentCapability {
  /** Stable kebab-case id used in configuration and permission prompts. */
  name: string;
  description: string;
  /** Tool names from the tool registry this agent may call. */
  toolNames: string[];
  inputModes: ContentMode[];
  outputModes: ContentMode[];
  /** When true every tool call needs a human confirmation before executing. */
  requiresApproval: boolean;
  /** Upper bound on simultaneous runs; 0 means the capability is disabled. */
  maxConcurrentRuns: number;
}

export function validateAgentCapability(raw: unknown): ValidationResult<AgentCapability> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path: "capability", message: `expected an object, got ${typeof raw}` }]);
  }
  const name = requireString(issues, "capability.name", raw.name, { maxLength: 120 });
  const description = requireString(issues, "capability.description", raw.description, { maxLength: 2000 });

  let toolNames: string[] = [];
  if (raw.toolNames !== undefined && raw.toolNames !== null) {
    const parsed = requireStringArray(issues, "capability.toolNames", raw.toolNames);
    if (parsed !== null) toolNames = parsed;
  }

  const inputModes = validateModes(issues, "capability.inputModes", raw.inputModes);
  const outputModes = validateModes(issues, "capability.outputModes", raw.outputModes);
  const requiresApproval = requireBoolean(issues, "capability.requiresApproval", raw.requiresApproval);
  const maxConcurrentRuns = requireInt(issues, "capability.maxConcurrentRuns", raw.maxConcurrentRuns, { min: 0 });

  if (name === null || description === null || inputModes === null || outputModes === null) {
    return invalid(issues);
  }
  if (requiresApproval === null || maxConcurrentRuns === null) return invalid(issues);
  if (issues.length > 0) return invalid(issues);

  return valid({ name, description, toolNames, inputModes, outputModes, requiresApproval, maxConcurrentRuns });
}

function validateModes(issues: IssueSink, path: string, value: unknown): ContentMode[] | null {
  if (!Array.isArray(value)) {
    issues.push({ path, message: `expected an array of ${CONTENT_MODES.join(" | ")}` });
    return null;
  }
  const modes: ContentMode[] = [];
  for (const [index, entry] of value.entries()) {
    const mode = requireOneOf(issues, `${path}[${index}]`, entry, CONTENT_MODES);
    if (mode !== null) modes.push(mode);
  }
  return modes.length === value.length ? modes : null;
}

export interface ModelCapability {
  provider: string;
  model: string;
  /** Tokens the model accepts in one request; the budget planner trims to this. */
  contextWindowTokens: number;
  /** Tokens the model may emit; null when the provider exposes no hard cap. */
  maxOutputTokens: number | null;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
}

export function validateModelCapability(raw: unknown): ValidationResult<ModelCapability> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path: "modelCapability", message: `expected an object, got ${typeof raw}` }]);
  }
  const provider = requireString(issues, "modelCapability.provider", raw.provider, { maxLength: 120 });
  const model = requireString(issues, "modelCapability.model", raw.model, { maxLength: 200 });
  const contextWindowTokens = requireInt(issues, "modelCapability.contextWindowTokens", raw.contextWindowTokens, { min: 1 });

  let maxOutputTokens: number | null = null;
  if (raw.maxOutputTokens !== undefined && raw.maxOutputTokens !== null) {
    maxOutputTokens = requireInt(issues, "modelCapability.maxOutputTokens", raw.maxOutputTokens, { min: 1 });
  }

  const supportsTools = requireBoolean(issues, "modelCapability.supportsTools", raw.supportsTools);
  const supportsStructuredOutput = requireBoolean(
    issues,
    "modelCapability.supportsStructuredOutput",
    raw.supportsStructuredOutput,
  );
  const supportsVision = requireBoolean(issues, "modelCapability.supportsVision", raw.supportsVision);
  const supportsStreaming = requireBoolean(issues, "modelCapability.supportsStreaming", raw.supportsStreaming);

  if (provider === null || model === null || contextWindowTokens === null) return invalid(issues);
  if (supportsTools === null || supportsStructuredOutput === null || supportsVision === null) return invalid(issues);
  if (supportsStreaming === null) return invalid(issues);
  if (issues.length > 0) return invalid(issues);

  return valid({
    provider,
    model,
    contextWindowTokens,
    maxOutputTokens,
    supportsTools,
    supportsStructuredOutput,
    supportsVision,
    supportsStreaming,
  });
}

export const PROVIDER_HEALTH_STATUSES = ["healthy", "degraded", "unavailable", "unknown"] as const;

export type ProviderHealthStatus = (typeof PROVIDER_HEALTH_STATUSES)[number];

export interface ProviderHealth {
  provider: string;
  status: ProviderHealthStatus;
  /** When this reading was taken; health without a timestamp is not actionable. */
  checkedAt: string;
  /** Round-trip latency in milliseconds, or null when the probe never connected. */
  latencyMs: number | null;
  /** Human-readable cause, required when the status is not healthy. */
  reason?: string | null;
}

export function validateProviderHealth(raw: unknown): ValidationResult<ProviderHealth> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path: "providerHealth", message: `expected an object, got ${typeof raw}` }]);
  }
  const provider = requireString(issues, "providerHealth.provider", raw.provider, { maxLength: 120 });
  const status = requireOneOf(issues, "providerHealth.status", raw.status, PROVIDER_HEALTH_STATUSES);
  const checkedAt = requireTimestamp(issues, "providerHealth.checkedAt", raw.checkedAt);

  let latencyMs: number | null = null;
  if (raw.latencyMs !== undefined && raw.latencyMs !== null) {
    latencyMs = requireInt(issues, "providerHealth.latencyMs", raw.latencyMs, { min: 0 });
  }

  let reason: string | null | undefined = null;
  if (raw.reason !== undefined && raw.reason !== null) {
    reason = requireString(issues, "providerHealth.reason", raw.reason, { maxLength: 1000 });
  }

  if (provider === null || status === null || checkedAt === null) return invalid(issues);
  if (status !== "healthy" && reason === null) {
    issues.push({ path: "providerHealth.reason", message: `a ${status} provider must say why` });
    return invalid(issues);
  }
  if (issues.length > 0) return invalid(issues);

  return valid({ provider, status, checkedAt, latencyMs, reason });
}
