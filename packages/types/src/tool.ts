// Tool registry and execution types.

export type ToolRisk = "read" | "execute" | "confirm";

export interface ToolDefinition {
  name: string;
  description: string;
  inputDescription: string;
  risk?: ToolRisk;
  requiresVisibleBrowser?: boolean;
  schema: Record<string, unknown>;
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  projectRoot: string;
  allowOutside: boolean;
  toolTimeoutMs: number;
  sessionId: string;
  operationKey: string;
  requestSignature: string;
  runAuxiliaryTurn: (options: AuxiliaryTurnOptions) => Promise<unknown>;
  onToolOutput: (output: ToolOutputPayload) => Promise<void>;
}

export interface ToolResult {
  callId?: string | null;
  name?: string | null;
  ok: boolean;
  message: string;
  output?: string | null;
  meta?: Record<string, unknown> | null;
  operationSignature?: string | null;
}

export interface ToolOutputPayload {
  output?: string | null;
  truncated?: boolean;
  originalBytes?: number;
  includedBytes?: number;
  omittedBytes?: number;
}

export interface AuxiliaryTurnOptions {
  text: string;
  files?: FileAttachment[];
  timeoutMs?: number;
  waitForCompletion: (context: AuxiliaryCompletionContext) => Promise<unknown>;
}

export interface FileAttachment {
  name?: string | null;
  path?: string | null;
}

export interface AuxiliaryCompletionContext {
  adapter: unknown;
  page: unknown;
  sendResult: unknown;
  timeoutMs: number;
}