// XML envelope and protocol types exchanged with the web AI model.

export interface AgentToolCall {
  name: string;
  args?: Record<string, unknown> | null;
  id?: string | null;
}

export interface AgentResponse {
  done: boolean;
  message: string;
  toolCall?: AgentToolCall | null;
  raw?: string;
}

export interface ParsedAgentResponse {
  done: boolean;
  message: string;
  toolCall?: AgentToolCall | null;
  raw?: string;
  recovered?: boolean;
}

// One text slot of an outbound <tool_result> after byte budgeting.
export interface XmlTextField {
  text: string;
  truncated: boolean;
  originalBytes: number;
  includedBytes: number;
}

export type XmlTextFieldName = "message" | "stdout" | "stderr" | "data";

// The executed-tool shape the runtime hands to the protocol serializer.
export interface ProtocolToolResult {
  name?: string | null;
  ok: boolean;
  message?: string | null;
  stdout?: string | null;
  stderr?: string | null;
  data?: unknown;
}

export interface SerializedToolResult {
  callId?: string | null;
  name?: string | null;
  ok: boolean;
  message: string;
  output?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ProtocolErrorPayload {
  message: string;
  code?: string;
}