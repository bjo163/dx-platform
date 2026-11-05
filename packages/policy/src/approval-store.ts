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
export interface ApprovalRecord {
  toolName: string;
  taskId: string;
  approvedAt: string;
}

export class ApprovalStore {
  filePath: string;
  taskId?: string;
  toolNames: Set<string>;
  allowAll: boolean;
  loaded: boolean;
  approvals: Map<string, Set<string>>; // toolName -> Set of taskIds that approved

  constructor({ filePath, taskId }: ApprovalStoreConstructorOptions) {
    this.filePath = filePath;
    this.taskId = taskId;
    this.toolNames = new Set();
    this.allowAll = false;
    this.loaded = false;
    this.approvals = new Map();
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
            this.approvals.set(rec.toolName, new Set());
          }
          for (const taskId of rec.taskIds) {
            if (typeof taskId === "string" && taskId) {
              this.approvals.get(rec.toolName)!.add(taskId);
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

  /** Check whether a task is allowed to approve a given tool, enforcing identity separation. */
  canApprove(toolName: string, taskId: string): boolean {
    // Always allow if allowAll is set (admin bypass).
    if (this.allowAll) return true;
    // A task cannot approve its own approval request (identity separation).
    if (this.approvals.has(toolName) && this.approvals.get(toolName)!.has(taskId)) {
      return false;
    }
    // Otherwise the task can approve this tool for the first time.
    return true;
  }

  recordApproval(toolName: string, taskId: string) {
    if (!this.approvals.has(toolName)) {
      this.approvals.set(toolName, new Set());
    }
    this.approvals.get(toolName)!.add(taskId);
  }

  async save() {
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        toolNames: [...this.toolNames].sort(),
        allowAll: this.allowAll,
        approvals: Array.from(this.approvals.entries()).map(([toolName, taskIds]) => ({
          toolName,
          taskIds: [...taskIds].sort(),
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
