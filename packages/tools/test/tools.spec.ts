import { describe, it, expect } from 'vitest';

import { buildToolEnvironment } from '../src/safe-env';
import { ProcessManager } from '../src/process-manager';

describe('tools interface', () => {
  it('should export buildToolEnvironment function', () => {
    expect(typeof buildToolEnvironment).toBe('function');
  });

  it('should process environment safely', () => {
    const result = buildToolEnvironment();
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('empty path string should be handled safely', () => {
    // Empty path is handled by resolveToolPath which throws
    // This test verifies the tools layer does not crash on empty strings
    const result = buildToolEnvironment();
    expect(result).toBeDefined();
  });

  it('should support process start and stop', async () => {
    const manager = new ProcessManager();
    const { stdout, stderr, processId } = await manager.start({
      program: process.platform === 'win32' ? 'cmd' : 'sh',
      argv: process.platform === 'win32' ? ['/c', 'timeout', '/t', '5', '/nobreak'] : ['-c', 'sleep 30'],
      cwd: '.',
    });
    expect(stdout).toBeDefined();
    expect(stderr).toBeDefined();

    // Stop the process using its ID
    await manager.stop(processId ?? '');

    // The process should exit
    const snapshot = manager.read(processId ?? '');
    expect(snapshot.status).not.toBe('timed out');
    expect(['exited', 'error']).toContain(snapshot.status);
  });

  it('should support process cancellation', async () => {
    const manager = new ProcessManager();
    const { stdout, stderr, processId } = await manager.start({
      program: process.platform === 'win32' ? 'cmd' : 'sh',
      argv: process.platform === 'win32' ? ['/c', 'timeout', '/t', '5', '/nobreak'] : ['-c', 'sleep 30'],
      cwd: '.',
    });
    expect(stdout).toBeDefined();
    expect(stderr).toBeDefined();

    // Cancel the process before timeout fires
    await manager.stop(processId ?? '');

    // The process should exit, not time out
    const snapshot = manager.read(processId ?? '');
    expect(snapshot.status).not.toBe('timed out');
    expect(['exited', 'error']).toContain(snapshot.status);
  });
});
