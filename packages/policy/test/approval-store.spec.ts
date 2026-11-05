import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { ApprovalStore } from '../src/approval-store.js';

function makeStore(taskId?: string) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-test-'));
  const storePath = path.join(tmpDir, 'approval.json');
  const store = new ApprovalStore({ filePath: storePath, taskId });
  return { store, storePath, tmpDir };
}

describe('ApprovalStore expiry and identity separation (DX2-0116, DX2-0117)', () => {
  it('should allow a task to approve a tool', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();

    expect(store.canApprove('tool-A', 'task-1')).toBe(true);
  });

  it('should block a task from approving its own approval request while valid', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();

    store.recordApproval('tool-A', 'task-1');
    expect(store.canApprove('tool-A', 'task-1')).toBe(false);
  });

  it('should allow a task to approve a tool after expiry', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();

    // Record approval with short expiry (1ms)
    store.recordApproval('tool-A', 'task-1', 1);
    expect(store.canApprove('tool-A', 'task-1')).toBe(false);

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 2));

    // Should be able to approve again after expiry
    expect(store.canApprove('tool-A', 'task-1')).toBe(true);
  });

  it('should allow a different task to approve the same tool', async () => {
    const { store, storePath } = makeStore('task-1');
    await store.ensureLoaded();

    store.recordApproval('tool-A', 'task-1');

    const store2 = new ApprovalStore({ filePath: storePath, taskId: 'task-2' });
    await store2.ensureLoaded();
    expect(store2.canApprove('tool-A', 'task-2')).toBe(true);
  });

  it('should allow approval when allowAll is set', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();
    store.setAlwaysAllowAll();

    expect(store.canApprove('any-tool', 'task-1')).toBe(true);
  });

  it('should persist and restore approval records with expiry', async () => {
    const { store, storePath } = makeStore('task-1');
    await store.ensureLoaded();

    // Record approval with short expiry (100ms)
    store.recordApproval('tool-A', 'task-1', 100);
    await store.save();

    // Create a new store that loads from the same file
    const store2 = new ApprovalStore({ filePath: storePath, taskId: 'task-2' });
    await store2.ensureLoaded();

    // task-2 should be able to approve tool-A since task-1 already approved it
    expect(store2.canApprove('tool-A', 'task-2')).toBe(true);
    // task-1 should NOT be able to approve tool-A again (identity separation after restore)
    expect(store2.canApprove('tool-A', 'task-1')).toBe(false);

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 150));

    // Now task-1 should be able to approve again
    expect(store2.canApprove('tool-A', 'task-1')).toBe(true);
  });

  it('should handle empty approvals gracefully', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();

    // No approvals recorded, task-1 can approve any tool
    expect(store.canApprove('tool-A', 'task-1')).toBe(true);
  });

  it('should allow first approval and then block same task', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();

    // First approval is allowed
    expect(store.canApprove('tool-A', 'task-1')).toBe(true);
    store.recordApproval('tool-A', 'task-1');

    // Second attempt is blocked
    expect(store.canApprove('tool-A', 'task-1')).toBe(false);
  });
});