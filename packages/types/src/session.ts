// Canonical transcript and session state types.

export type CanonicalRole = "user" | "assistant" | "system";

export interface CanonicalMessage {
  type: "message";
  role: CanonicalRole;
  text: string;
  attachments?: CanonicalAttachment[] | null;
}

export interface CanonicalFunctionCall {
  type: "function_call";
  name: string;
  args: Record<string, unknown>;
  callId: string;
}

export interface CanonicalFunctionOutput {
  type: "function_output";
  callId: string;
  output: string;
}

export type CanonicalItem = CanonicalMessage | CanonicalFunctionCall | CanonicalFunctionOutput;

export interface CanonicalTranscript {
  items: CanonicalTranscriptItem[];
}

export interface CanonicalTranscriptItem {
  id: string;
  item: CanonicalItem;
}

export interface CanonicalAttachment {
  name?: string | null;
  path?: string | null;
}

// Session state types for provider integration

export interface PendingOutbound {
  kind: string;
  outboundId: string;
  messageHash: string;
  preparedAt: string;
  transcriptItems: CanonicalTranscriptItem[];
  runtimeTurn: number | null;
  pendingToolAcknowledgement: PendingToolAcknowledgement | null;
  conversationUrl?: string | null;
  conversationTargetId?: string | null;
  status?: string | null;
  failedAt?: string | null;
}

export interface PendingToolAcknowledgement {
  callId?: string | null;
  name?: string | null;
  operationSignature?: string | null;
}

export interface PendingAssistantTurn {
  handoffId: string;
  status: "waiting" | "complete";
  runtimeTurn: number;
  responseHash?: string | null;
  rawResponse?: string | null;
  assistantMessageId?: string | null;
  assistantTurn?: number | null;
  nativeImages?: any[] | null;
  nativeMusic?: any[] | null;
  nativeArtifacts?: any[] | null;
  pendingToolAcknowledgement?: PendingToolAcknowledgement | null;
  sourceOutboundId?: string | null;
  conversationUrl?: string | null;
  conversationTargetId?: string | null;
}

export interface PendingAuxiliaryTurn {
  outboundId: string;
}

export interface PendingToolResult {
  callId?: string | null;
  name?: string | null;
  operationSignature?: string | null;
  result?: ToolResultRecord | null;
}

export interface ToolResultRecord {
  callId?: string | null;
  name?: string | null;
  ok: boolean;
  message: string;
  output?: string | null;
  meta?: Record<string, unknown> | null;
  operationSignature?: string | null;
}

export interface SideEffectToolRecord {
  operationKey: string;
  fingerprint: string;
  name: string;
  status: "claimed" | "completed" | "unknown";
  result?: ToolResultRecord | null;
}

// Native payload types

export interface NativeImagePayload {
  url?: string | null;
  dataUrl?: string | null;
  mime?: string | null;
}

export interface NativeMusicPayload {
  url?: string | null;
  dataUrl?: string | null;
  mime?: string | null;
}
