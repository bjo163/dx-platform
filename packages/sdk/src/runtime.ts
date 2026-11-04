// Type definitions for the SDK

export interface BrowserAdapter {
  providerName: string;
  getConversationUrl(): URL;
  getAuthState(): Promise<"not_authenticated" | "authenticated">;
  getLastSendStatus(): Promise<"not-submitted" | "committing" | "committed" | "failed">;
  getLastAssistantMessageId(): Promise<string | null>;
  getLastAssistantTurn(): Promise<any | null>;
  classifyConversationUrl?(url: URL): "fresh" | "restorable" | "provisional";
  reconnect?(
    conversationUrl: URL,
    options?: { preferredTargetId?: string | null },
  ): Promise<void>;
  launch?(conversationUrl?: URL, options?: {
    preferredTargetId?: string | null,
  }): Promise<void>;
  startConversation?(resumeUrl?: URL): Promise<{
    status: "restored-existing" | "verified-fresh" | "new";
    targetId?: string | null;
    conversationUrl: URL;
  }>;
  captureAuxiliaryTurnCompletion?(
    options: { timeoutMs: number },
  ): Promise<{ assistantMessageId?: string; assistantTurn?: any } | null>;
  acceptRecoveredOutboundAnchor?(
    options: {
      conversationUrl: URL;
      conversationTargetId?: string | null;
      userMessageId?: string | null;
      userTurn?: string | null;
      assistantBaseline?: any | null;
      assistantCandidateMessageId?: string | null;
      assistantCandidateTurn?: string | null;
    },
  ): Promise<void>;
  launchRecoveryTarget?(targetId: string): Promise<void>;
  supportsPendingOutboundRecovery?(): Promise<boolean>;
}

export interface JobRequest {
  task: string;
  provider?: string;
  projectRoot?: string;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateRuntimeOptions {
  provider: string;
  model: string;
  browser?: boolean;
  apiKey?: string;
  adapter?: BrowserAdapter;
  limits?: {
    maxBytesPerTurn?: number;
    maxAssistantMessageBytes?: number;
    modelTurnTimeoutMs?: number;
    maxRetryAttempts?: number;
    retryBackoffBaseMs?: number;
    retryBackoffMaxMs?: number;
    retryJitterMs?: number;
  };
}

export function createRuntime(options: CreateRuntimeOptions): any {
  const { provider, model, browser = false, apiKey, adapter, limits } = options

  // Use provided adapter or create a minimal stub
  let finalAdapter: any = adapter || {
    providerName: provider,
    getConversationUrl: () => new URL("/"),
    getAuthState: async () => "not_authenticated",
    getLastSendStatus: async () => "not-submitted",
    getLastAssistantMessageId: async () => null,
    getLastAssistantTurn: async () => null,
    classifyConversationUrl: () => "fresh",
    reconnect: async () => {},
    launch: async () => {},
    startConversation: async () => ({ status: "verified-fresh" }),
    captureAuxiliaryTurnCompletion: async () => null,
    acceptRecoveredOutboundAnchor: async () => {},
    launchRecoveryTarget: async () => {},
    supportsPendingOutboundRecovery: async () => false,
  }

  const defaultLimits = {
    maxBytesPerTurn: limits?.maxBytesPerTurn ?? 256 * 1024,
    maxAssistantMessageBytes: limits?.maxAssistantMessageBytes ?? 64 * 1024,
    modelTurnTimeoutMs: limits?.modelTurnTimeoutMs ?? 10 * 60_000,
    maxRetryAttempts: limits?.maxRetryAttempts ?? 3,
    retryBackoffBaseMs: limits?.retryBackoffBaseMs ?? 500,
    retryBackoffMaxMs: limits?.retryBackoffMaxMs ?? 10_000,
    retryJitterMs: limits?.retryJitterMs ?? 250,
  }

  return {
    adapter: finalAdapter,
    provider,
    model,
    browser,
    onEvent: undefined,
    approve: undefined,
    conversationIdentityQueue: Promise.resolve(),
    deferConversationIdentityPersistence: false,
    limits: defaultLimits,
    random: Math.random,
    emit: async (type: string, payload?: Record<string, any>) => {
      const event = { type, payload, timestamp: Date.now() }
      return event
    },
    sendMessage: async (text: string, opts?: {
      files?: any[];
      maxBytes?: number;
      allowFreshReconnect?: boolean;
      allowAssistantContinuation?: boolean;
      requireAttachments?: boolean;
      outboundKind?: string;
      transcriptItems?: any[];
      runtimeTurn?: number;
      pendingToolAcknowledgement?: any;
    }) => {
      return { type: "message", text, ...(opts || {}) }
    },
  }
}