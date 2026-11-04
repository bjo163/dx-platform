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