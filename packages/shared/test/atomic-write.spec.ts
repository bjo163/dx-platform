import { describe, it, expect, vi, beforeEach } from 'vitest';

import { replaceFileAtomic } from '../src/atomic-write';

describe('replaceFileAtomic', () => {
  it('should call rename successfully on first attempt', async () => {
    const mockRename = vi.fn().mockResolvedValue(undefined);

    await replaceFileAtomic('/tmp/temp-file', '/tmp/dest-file', {
      rename: mockRename,
      attempts: 1,
    });

    expect(mockRename).toHaveBeenCalledTimes(1);
    expect(mockRename).toHaveBeenCalledWith('/tmp/temp-file', '/tmp/dest-file');
  });

  it('should retry on retryable Windows errors', async () => {
    const retryableError = { code: 'EACCES' };
    const mockRename = vi.fn()
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce(undefined);

    await replaceFileAtomic('/tmp/temp-file', '/tmp/dest-file', {
      platform: 'win32',
      rename: mockRename,
      attempts: 2,
      retryDelayMs: 1,
    });

    expect(mockRename).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const nonRetryableError = { code: 'ENOENT' };
    const mockRename = vi.fn().mockRejectedValue(nonRetryableError);

    await expect(replaceFileAtomic('/tmp/temp-file', '/tmp/dest-file', {
      platform: 'win32',
      rename: mockRename,
      attempts: 3,
      retryDelayMs: 1,
    })).rejects.toThrow();

    expect(mockRename).toHaveBeenCalledTimes(1);
  });

  it('should not retry on non-Windows platforms', async () => {
    const error = { code: 'EACCES' };
    const mockRename = vi.fn().mockRejectedValue(error);

    await expect(replaceFileAtomic('/tmp/temp-file', '/tmp/dest-file', {
      platform: 'linux',
      rename: mockRename,
      attempts: 3,
      retryDelayMs: 1,
    })).rejects.toThrow();

    expect(mockRename).toHaveBeenCalledTimes(1);
  });

  it('should throw after max attempts exhausted', async () => {
    const error = { code: 'EACCES' };
    const mockRename = vi.fn().mockRejectedValue(error);

    await expect(replaceFileAtomic('/tmp/temp-file', '/tmp/dest-file', {
      platform: 'win32',
      rename: mockRename,
      attempts: 3,
      retryDelayMs: 1,
    })).rejects.toThrow();

    expect(mockRename).toHaveBeenCalledTimes(3);
  });

  it('should use custom retry delay', async () => {
    const error = { code: 'EACCES' };
    const mockRename = vi.fn().mockRejectedValue(error);

    const start = Date.now();
    try {
      await replaceFileAtomic('/tmp/temp-file', '/tmp/dest-file', {
        platform: 'win32',
        rename: mockRename,
        attempts: 3,
        retryDelayMs: 10,
      });
    } catch {
      // expected to throw
    }
    const elapsed = Date.now() - start;

    // Should wait ~10 + 20 + 30 = 60ms (with tolerance for test environment)
    expect(elapsed).toBeGreaterThanOrEqual(10);
    expect(elapsed).toBeLessThan(200);
  });

  it('should use default options when not provided', async () => {
    const mockRename = vi.fn().mockResolvedValue(undefined);

    // Test that default parameters work
    await replaceFileAtomic('/tmp/temp-file', '/tmp/dest-file', {
      rename: mockRename,
    });

    expect(mockRename).toHaveBeenCalledTimes(1);
  });

  it('should handle EBUSY error code', async () => {
    const error = { code: 'EBUSY' };
    const mockRename = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);

    await replaceFileAtomic('/tmp/temp-file', '/tmp/dest-file', {
      platform: 'win32',
      rename: mockRename,
      attempts: 2,
      retryDelayMs: 1,
    });

    expect(mockRename).toHaveBeenCalledTimes(2);
  });

  it('should handle EPERM error code', async () => {
    const error = { code: 'EPERM' };
    const mockRename = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);

    await replaceFileAtomic('/tmp/temp-file', '/tmp/dest-file', {
      platform: 'win32',
      rename: mockRename,
      attempts: 2,
      retryDelayMs: 1,
    });

    expect(mockRename).toHaveBeenCalledTimes(2);
  });
});
