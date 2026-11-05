// Web provider (browser adapter) types.

export type AuthState = "authenticated" | "guest" | "unknown";

export type ConversationKind = "restorable" | "provisional" | "fresh";

export interface ConversationIdentity {
  conversationUrl: string;
  targetId?: string | null;
  kind?: ConversationKind | null;
}

export interface RestorationResult {
  status: "restored-existing" | "verified-fresh" | "unknown";
  conversationUrl: string;
  targetId?: string | null;
  userMessageId?: string | null;
  userTurn?: number | null;
  assistantBaseline?: number | null;
  assistantMessageId?: string | null;
  assistantTurn?: number | null;
  rawResponse?: string | null;
  responseHash?: string | null;
}

export interface ProviderAdapter {
  readonly providerName: string;
  readonly profileDir: string;
  readonly page: unknown;

  launch(url: string | null, options: LaunchOptions): Promise<void>;
  startConversation(url: string | null, options: StartConversationOptions): Promise<RestorationResult>;
  sendMessage(text: string, options: SendMessageOptions): Promise<SendMessageResult>;
  waitForTurnComplete(options: WaitForTurnOptions): Promise<unknown>;
  getConversationUrl(): Promise<string>;
  getConversationIdentity(): Promise<ConversationIdentity | null>;
  classifyConversationUrl(url: string): ConversationKind;
  getLastSendStatus(): string;
  getLastAssistantMessageId(): Promise<string | null>;
  getLastAssistantTurn(): Promise<number | null>;
  captureAuxiliaryTurnCompletion(options: { timeoutMs: number }): Promise<RestorationResult | null>;
  writeDiagnostics(stage: string, payload: Record<string, unknown>): Promise<void>;
  restoreWindow?(): Promise<void>;
  minimizeWindow?(): Promise<void>;
  detach?(): Promise<void>;
  reconnect?(url: string, options: ReconnectOptions): Promise<void>;
  launchRecoveryTarget(targetId: string): Promise<void>;
  reconcilePendingOutbound(options: ReconcileOptions): Promise<ReconcileOutcome>;
  acceptRecoveredOutboundAnchor?(anchor: Record<string, unknown>): void;
  setConversationIdentityListener?(listener: (identity: ConversationIdentity) => void): void;
  supportsPendingOutboundRecovery?(): boolean;
  waitForManualLogin(options: { timeoutMs: number }): Promise<void>;
  getAuthState(): Promise<AuthState>;
  bringToFront?(): Promise<void>;
}

export interface LaunchOptions {
  preferredTargetId?: string | null;
}

export interface StartConversationOptions {
  expectedAssistantMessageId?: string | null;
  expectedUserMessageId?: string | null;
}

export interface SendMessageOptions {
  files?: FileAttachment[];
  maxBytes?: number | null;
  outboundId: string;
  allowAssistantContinuation: boolean;
  requireAttachments: boolean;
}

export interface SendMessageResult {
  conversationUrl?: string;
  conversationTargetId?: string;
  userMessageId?: string | null;
  userTurn?: number | null;
  assistantBaseline?: number | null;
  preOutboundMarkerIds?: string[];
}

export interface WaitForTurnOptions {
  timeoutMs: number;
  stableWindowMs: number;
  emptyResponseWindowMs: number;
  deadRequestGraceMs: number;
  readNativeImages?: ((message: string) => Promise<NativeImagePayload[]>) | null;
  readNativeMusic?: ((message: string) => Promise<NativeMusicPayload[]>) | null;
  onDelta?: ((delta: string) => Promise<void>) | null;
}

export interface ReconnectOptions {
  preferredTargetId?: string | null;
}

export interface ReconcileOptions {
  pendingOutbound: PendingOutbound | null;
  priorHandoff: PendingAssistantTurn | null;
  conversationTargetId: string;
  lastUserMessageId: string | null;
  lastAssistantMessageId: string | null;
}

export interface ReconcileOutcome {
  status: "waiting" | "complete";
  conversationUrl?: string;
  conversationTargetId?: string;
  userMessageId?: string | null;
  userTurn?: number | null;
  assistantBaseline?: number | null;
  rawResponse?: string | null;
  responseHash?: string | null;
  assistantMessageId?: string | null;
  assistantTurn?: number | null;
}

// Re-export types from session module
import type { PendingOutbound, PendingAssistantTurn, NativeImagePayload, NativeMusicPayload } from "./session.js";
import type { FileAttachment } from "./tool.js";
export type { PendingOutbound, PendingAssistantTurn, NativeImagePayload, NativeMusicPayload };
