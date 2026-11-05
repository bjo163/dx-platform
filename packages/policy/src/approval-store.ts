import fs from "node:fs/promises";
import { replaceFileAtomic } from "@dx-platform/shared";

// Persisted "always allow" decisions made at the approval prompt. Lives in the
// app data directory so it survives session resumes and new sessions.
export interface ApprovalStoreConstructorOptions {
  filePath: string;
  taskId?: string; // Optional task ID for identity separation
}

// Track which task IDs have approved which tools, to enforce identity separation:
// a task cannot approve its own approval request (same taskId).
// Approvals expire after a certain time to prevent indefinite reuse.
export interface ApprovalRecord {
  toolName: string;
  taskId: string;
  approvedAt: string;
  expiresAt: string;
}

export class ApprovalStore {
  filePath: string;
  taskId?: string;
  toolNames: Set<string>;
  allowAll: boolean;
  loaded: boolean;
  approvals: Map<string, Map<string, number>>; // toolName -> Map of taskId -> expiresAt (timestamp)
  defaultExpiryMs: number; // Default expiry time in milliseconds (e.g., 24 hours)

  constructor({ filePath, taskId }: ApprovalStoreConstructorOptions) {
    this.filePath = filePath;
    this.taskId = taskId;
    this.toolNames = new Set();
    this.allowAll = false;
    this.loaded = false;
    this.approvals = new Map();
    // Default expiry: 24 hours
    this.defaultExpiryMs = 24 * 60 * 60 * 1000;
  }

  async ensureLoaded() {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, "utf8"));
      if (parsed?.allowAll === true) {
        this.allowAll = true;
      }
      for (const name of parsed?.toolNames ?? []) {
        if (typeof name === "string" && name) {
          this.toolNames.add(name);
        }
      }
      for (const rec of parsed?.approvals ?? []) {
        if (rec?.toolName && Array.isArray(rec?.taskIds)) {
          if (!this.approvals.has(rec.toolName)) {
            this.approvals.set(rec.toolName, new Map());
          }
          for (const entry of rec.taskIds) {
            if (entry?.taskId && typeof entry.taskId === "string" && entry.taskId) {
              const expiresAt = typeof entry.expiresAt === "number" ? entry.expiresAt : Date.parse(entry.expiresAt);
              if (!isNaN(expiresAt)) {
                this.approvals.get(rec.toolName)!.set(entry.taskId, expiresAt);
              }
            }
          }
        }
      }
    } catch (error) {
      // A missing or unreadable file simply means no saved approvals. Anything
      // beyond ENOENT is treated as corrupt and ignored rather than crashing.
      if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.toolNames.clear();
        this.allowAll = false;
        this.approvals.clear();
      }
    }
  }

  isAlwaysAllowed(toolName: string) {
    return this.allowAll || this.toolNames.has(toolName);
  }

  setAlwaysAllowedTool(toolName: string) {
    this.toolNames.add(toolName);
  }

  setAlwaysAllowAll() {
    this.allowAll = true;
  }

  setDefaultExpiryMs(expiryMs: number) {
    this.defaultExpiryMs = expiryMs;
  }

  /** Check whether a task is allowed to approve a given tool, enforcing identity separation and expiry. */
  canApprove(toolName: string, taskId: string, now = Date.now()): boolean {
    // Always allow if allowAll is set (admin bypass).
    if (this.allowAll) return true;
    // A task cannot approve its own approval request if it's still valid.
    if (this.approvals.has(toolName)) {
      const taskApprovals = this.approvals.get(toolName)!;
      if (taskApprovals.has(taskId)) {
        const expiresAt = taskApprovals.get(taskId)!;
        if (now < expiresAt) {
          return false; // Still valid, cannot re-approve
        } else {
          // Expired - clean up
          taskApprovals.delete(taskId);
          if (taskApprovals.size === 0) {
            this.approvals.delete(toolName);
          }
        }
      }
    }
    // Otherwise the task can approve this tool for the first time.
    return true;
  }

  recordApproval(toolName: string, taskId: string, expiresAtMs?: number) {
    const expiresAt = (expiresAtMs ?? this.defaultExpiryMs) + Date.now();
    if (!this.approvals.has(toolName)) {
      this.approvals.set(toolName, new Map());
    }
    this.approvals.get(toolName)!.set(taskId, expiresAt);
  }

  /** Check if a specific approval is still valid (not expired) */
  isApprovalValid(toolName: string, taskId: string, now = Date.now()): boolean {
    if (!this.approvals.has(toolName)) return false;
    const taskApprovals = this.approvals.get(toolName)!;
    if (!taskApprovals.has(taskId)) return false;
    const expiresAt = taskApprovals.get(taskId)!;
    return now < expiresAt;
  }

  async save() {
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        toolNames: [...this.toolNames].sort(),
        allowAll: this.allowAll,
        approvals: Array.from(this.approvals.entries()).map(([toolName, taskMap]) => ({
          toolName,
          taskIds: Array.from(taskMap.entries()).map(([taskId, expiresAt]) => ({
            taskId,
            expiresAt,
          })).sort((a, b) => a.taskId.localeCompare(b.taskId)),
        })),
      }, null, 2)}\n`,
      { mode: 0o600 },
    );
    try {
      await replaceFileAtomic(temporary, this.filePath);
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
  }
}