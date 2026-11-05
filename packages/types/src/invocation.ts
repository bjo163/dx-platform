// One requested tool execution, from the model's intent through the policy
// decision to the result. Existing shapes cover fragments of this:
// AgentToolCall is the wire form, CanonicalFunctionCall is the transcript form,
// ApprovalRecord is the audit form. ToolCall is the single object that ties an
// input to the permission that was granted and the correlation everything else
// is logged against.

import {
  invalid,
  isPlainObject,
  requireOneOf,
  requireString,
  valid,
  type IssueSink,
  type ValidationResult,
} from "./validation.js";
import type { PolicyAction } from "./policy.js";
import type { ToolResult } from "./tool.js";

/** How this call is allowed to run. Reuses PolicyAction so both sides agree. */
export type ToolPermission = PolicyAction;

export const TOOL_PERMISSIONS: readonly ToolPermission[] = ["allow", "deny", "confirm"];

export interface ToolCall {
  /** Id assigned by the model/provider; echoed back on the result. */
  callId: string;
  /** Stable id for one agent turn, shared by every call in that turn. */
  correlationId: string;
  name: string;
  input: Record<string, unknown>;
  permission: ToolPermission;
  result?: ToolResult | null;
}

export function validateToolCall(raw: unknown): ValidationResult<ToolCall> {
  const issues: IssueSink = [];
  if (!isPlainObject(raw)) {
    return invalid([{ path: "toolCall", message: `expected an object, got ${typeof raw}` }]);
  }
  const callId = requireString(issues, "toolCall.callId", raw.callId, { maxLength: 200 });
  const correlationId = requireString(issues, "toolCall.correlationId", raw.correlationId, { maxLength: 200 });
  const name = requireString(issues, "toolCall.name", raw.name, { maxLength: 120 });
  const permission = requireOneOf(issues, "toolCall.permission", raw.permission, TOOL_PERMISSIONS);

  if (!isPlainObject(raw.input)) {
    issues.push({ path: "toolCall.input", message: "expected an object of named arguments" });
  }
  if (callId === null || correlationId === null || name === null || permission === null) return invalid(issues);

  // The result keeps the shape ToolResult already defines; anything else is a
  // producer bug and is reported rather than silently narrowed.
  if (raw.result !== undefined && raw.result !== null) {
    const result = raw.result;
    if (!isPlainObject(result) || typeof result.ok !== "boolean" || typeof result.message !== "string") {
      issues.push({ path: "toolCall.result", message: "expected a ToolResult with boolean ok and string message" });
    }
  }
  if (issues.length > 0) return invalid(issues);

  return valid({
    callId,
    correlationId,
    name,
    input: raw.input as Record<string, unknown>,
    permission,
    result: (raw.result as ToolResult | undefined) ?? null,
  });
}
