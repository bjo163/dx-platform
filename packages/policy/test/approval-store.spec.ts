import { describe, it, expect } from 'vitest';
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

describe('ApprovalStore identity separation (DX2-0116)', () => {
  it('should allow a task to approve a tool', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();

    expect(store.canApprove('tool-A', 'task-1')).toBe(true);
  });

  it('should block a task from approving its own approval request', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();

    store.recordApproval('tool-A', 'task-1');
    expect(store.canApprove('tool-A', 'task-1')).toBe(false);
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

  it('should persist and restore approval records', async () => {
    const { store, storePath } = makeStore('task-1');
    await store.ensureLoaded();

    store.recordApproval('tool-A', 'task-1');
    await store.save();

    const store2 = new ApprovalStore({ filePath: storePath, taskId: 'task-2' });
    await store2.ensureLoaded();

    expect(store2.canApprove('tool-A', 'task-2')).toBe(true);
    expect(store2.canApprove('tool-A', 'task-1')).toBe(false);
  });

  it('should handle empty approvals gracefully', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();

    expect(store.canApprove('tool-A', 'task-1')).toBe(true);
  });

  it('should allow first approval and then block same task', async () => {
    const { store } = makeStore('task-1');
    await store.ensureLoaded();

    expect(store.canApprove('tool-A', 'task-1')).toBe(true);
    store.recordApproval('tool-A', 'task-1');
    expect(store.canApprove('tool-A', 'task-1')).toBe(false);
  });
});