// Policy engine types.

export type PolicyAction = "allow" | "deny" | "confirm";

export interface PolicyDecision {
  action: PolicyAction;
  reasons: string[];
  grants?: PolicyGrants | null;
}

export interface PolicyGrants {
  allowOutside: boolean;
}

export interface PolicyContext {
  projectRoot: string;
}

export interface ApprovalRequest {
  toolCall: unknown;
  reasons: string[];
}

export interface ApprovalResult {
  approved: boolean;
  remember?: boolean;
}

export interface ApprovalRecord {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  reasons: string[];
  decidedAt: string;
  approved: boolean;
  remember: boolean;
}
