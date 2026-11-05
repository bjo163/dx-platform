import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules - using named exports but the code uses default import
// So we need to mock both default and named exports
vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
  },
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('node:path', () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join('/')),
  },
  join: vi.fn((...args: string[]) => args.join('/')),
}));

vi.mock('@dx-platform/shared', () => ({
  replaceFileAtomic: vi.fn(),
}));

import { JobStore } from '../src/job-store';
import { isValidJobId, assertValidJobId, JobStatus } from '../src/job-store';

describe('JobStore', () => {
  let store: JobStore;
  const testDir = '/tmp/test-jobs';

  beforeEach(() => {
    store = new JobStore(testDir);
  });

  describe('Job ID validation', () => {
    it('should validate valid job ids', () => {
      expect(isValidJobId('abc123')).toBe(true);
      expect(isValidJobId('a_b-c')).toBe(true);
      expect(isValidJobId('A1')).toBe(true);
    });

    it('should reject invalid job ids', () => {
      expect(isValidJobId('')).toBe(false);
      expect(isValidJobId('a'.repeat(65))).toBe(false);
      expect(isValidJobId('abc/def')).toBe(false);
      expect(isValidJobId(123)).toBe(false);
      expect(isValidJobId(null)).toBe(false);
      expect(isValidJobId(undefined)).toBe(false);
    });

    it('should assert valid job ids', () => {
      expect(assertValidJobId('abc123')).toBe('abc123');
    });

    it('should throw on invalid job ids', () => {
      expect(() => assertValidJobId('')).toThrow(RangeError);
      expect(() => assertValidJobId('invalid/')).toThrow(RangeError);
    });
  });

  describe('initialize', () => {
    it('should create jobs directory', async () => {
      const fs = await import('node:fs/promises');
      await store.initialize();
      expect(fs.default.mkdir).toHaveBeenCalledWith(testDir, { recursive: true, mode: 0o700 });
    });
  });

  describe('create', () => {
    it('should create a job with default values', async () => {
      const now = new Date('2024-01-01T00:00:00.000Z');
      const originalDate = global.Date;
      // @ts-ignore - mocking global.Date
      global.Date = class extends originalDate {
        constructor() {
          super(now.toISOString());
        }
        static now() {
          return now.getTime();
        }
        static toISOString() {
          return now.toISOString();
        }
      };

      const input = {
        jobId: 'job-123',
        task: 'Test task',
        sessionId: 'session-456',
        projectRoot: '/project',
        provider: 'chatgpt',
      };

      const record = await store.create(input);

      expect(record).toMatchObject({
        jobId: 'job-123',
        task: 'Test task',
        status: 'pending',
        sessionId: 'session-456',
        projectRoot: '/project',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        startedAt: null,
        completedAt: null,
        attempts: 0,
        lease: null,
        cancelRequested: false,
        result: null,
        error: null,
      });

      const fs = await import('node:fs/promises');
      expect(fs.default.writeFile).toHaveBeenCalled();
      
      // Restore Date
      global.Date = originalDate;
    });

    it('should normalize allowedTools to unique values', async () => {
      const now = new Date('2024-01-01T00:00:00.000Z');
      const originalDate = global.Date;
      // @ts-ignore - mocking global.Date
      global.Date = class extends originalDate {
        constructor() {
          super(now.toISOString());
        }
        static now() {
          return now.getTime();
        }
        static toISOString() {
          return now.toISOString();
        }
      };

      const input = {
        jobId: 'job-123',
        task: 'Test task',
        sessionId: 'session-456',
        projectRoot: '/project',
        provider: 'chatgpt',
        allowedTools: ['read', 'write', 'read'],
      };

      const record = await store.create(input);
      expect(record.allowedTools).toEqual(['read', 'write']);
      
      global.Date = originalDate;
    });
  });

  describe('read', () => {
    it('should return null for non-existent job', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readFile.mockRejectedValue({ code: 'ENOENT' });
      const record = await store.read('nonexistent');
      expect(record).toBeNull();
    });

    it('should return job record for existing job', async () => {
      const fs = await import('node:fs/promises');
      const record = {
        jobId: 'job-123',
        task: 'Test',
        status: 'pending',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: null,
        completedAt: null,
        attempts: 0,
        lease: null,
        cancelRequested: false,
        result: null,
        error: null,
      };
      fs.default.readFile.mockResolvedValue(JSON.stringify(record));

      const result = await store.read('job-123');
      expect(result).toEqual(record);
    });

    it('should throw on non-ENOENT errors', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readFile.mockRejectedValue({ code: 'EACCES' });
      await expect(store.read('job-123')).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a job record', async () => {
      const fs = await import('node:fs/promises');
      const original = {
        jobId: 'job-123',
        task: 'Test',
        status: 'pending',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: null,
        completedAt: null,
        attempts: 0,
        lease: null,
        cancelRequested: false,
        result: null,
        error: null,
      };

      fs.default.readFile.mockResolvedValue(JSON.stringify(original));
      fs.default.writeFile.mockResolvedValue(undefined);

      const updated = await store.update('job-123', (record) => ({
        status: 'running',
        startedAt: '2024-01-01T01:00:00Z',
      }));

      expect(updated?.status).toBe('running');
      expect(updated?.startedAt).toBe('2024-01-01T01:00:00Z');
      expect(fs.default.writeFile).toHaveBeenCalled();
    });

    it('should return null for non-existent job', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readFile.mockResolvedValue(null);
      const result = await store.update('nonexistent', () => ({}));
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return empty array when directory is empty', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readdir.mockResolvedValue([]);
      const jobs = await store.list();
      expect(jobs).toEqual([]);
    });

    it('should return jobs sorted by createdAt', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readdir.mockResolvedValue(['job-1.json', 'job-2.json']);
      fs.default.readFile
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-1',
          task: 'Task 1',
          status: 'pending',
          sessionId: 'sess-1',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-02',
          updatedAt: '2024-01-02',
          startedAt: null,
          completedAt: null,
          attempts: 0,
          lease: null,
          cancelRequested: false,
          result: null,
          error: null,
        }))
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-2',
          task: 'Task 2',
          status: 'pending',
          sessionId: 'sess-2',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          startedAt: null,
          completedAt: null,
          attempts: 0,
          lease: null,
          cancelRequested: false,
          result: null,
          error: null,
        }));

      const jobs = await store.list();
      expect(jobs).toHaveLength(2);
      expect(jobs[0].jobId).toBe('job-2');
      expect(jobs[1].jobId).toBe('job-1');
    });

    it('should ignore non-json files', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readdir.mockResolvedValue(['job-1.json', 'readme.txt', 'temp.log']);
      fs.default.readFile.mockResolvedValue(JSON.stringify({
        jobId: 'job-1',
        task: 'Task 1',
        status: 'pending',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: null,
        completedAt: null,
        attempts: 0,
        lease: null,
        cancelRequested: false,
        result: null,
        error: null,
      }));

      const jobs = await store.list();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].jobId).toBe('job-1');
    });
  });

  describe('listByStatus', () => {
    it('should filter jobs by status', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readdir.mockResolvedValue(['job-1.json', 'job-2.json']);
      fs.default.readFile
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-1',
          task: 'Task 1',
          status: 'pending',
          sessionId: 'sess-1',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          startedAt: null,
          completedAt: null,
          attempts: 0,
          lease: null,
          cancelRequested: false,
          result: null,
          error: null,
        }))
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-2',
          task: 'Task 2',
          status: 'completed',
          sessionId: 'sess-2',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          startedAt: '2024-01-01T01:00:00Z',
          completedAt: '2024-01-01T02:00:00Z',
          attempts: 1,
          lease: null,
          cancelRequested: false,
          result: { message: 'Done' },
          error: null,
        }));

      const pendingJobs = await store.listByStatus('pending');
      expect(pendingJobs).toHaveLength(1);
      expect(pendingJobs[0].status).toBe('pending');

      // Re-setup mocks for second call
      fs.default.readdir.mockResolvedValue(['job-1.json', 'job-2.json']);
      fs.default.readFile
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-1',
          task: 'Task 1',
          status: 'pending',
          sessionId: 'sess-1',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          startedAt: null,
          completedAt: null,
          attempts: 0,
          lease: null,
          cancelRequested: false,
          result: null,
          error: null,
        }))
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-2',
          task: 'Task 2',
          status: 'completed',
          sessionId: 'sess-2',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          startedAt: '2024-01-01T01:00:00Z',
          completedAt: '2024-01-01T02:00:00Z',
          attempts: 1,
          lease: null,
          cancelRequested: false,
          result: { message: 'Done' },
          error: null,
        }));

      const completedJobs = await store.listByStatus('completed');
      expect(completedJobs).toHaveLength(1);
      expect(completedJobs[0].status).toBe('completed');

      // Re-setup mocks for third call
      fs.default.readdir.mockResolvedValue(['job-1.json', 'job-2.json']);
      fs.default.readFile
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-1',
          task: 'Task 1',
          status: 'pending',
          sessionId: 'sess-1',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          startedAt: null,
          completedAt: null,
          attempts: 0,
          lease: null,
          cancelRequested: false,
          result: null,
          error: null,
        }))
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-2',
          task: 'Task 2',
          status: 'completed',
          sessionId: 'sess-2',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          startedAt: '2024-01-01T01:00:00Z',
          completedAt: '2024-01-01T02:00:00Z',
          attempts: 1,
          lease: null,
          cancelRequested: false,
          result: { message: 'Done' },
          error: null,
        }));

      const allJobs = await store.listByStatus('pending', 'completed');
      expect(allJobs).toHaveLength(2);
    });
  });

  describe('claimNext', () => {
    it('should claim the oldest pending job', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readdir.mockResolvedValue(['job-1.json', 'job-2.json']);
      fs.default.readFile
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-1',
          task: 'Task 1',
          status: 'pending',
          sessionId: 'sess-1',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-02',
          updatedAt: '2024-01-02',
          startedAt: null,
          completedAt: null,
          attempts: 0,
          lease: null,
          cancelRequested: false,
          result: null,
          error: null,
        }))
        .mockResolvedValueOnce(JSON.stringify({
          jobId: 'job-2',
          task: 'Task 2',
          status: 'pending',
          sessionId: 'sess-2',
          projectRoot: '/proj',
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          startedAt: null,
          completedAt: null,
          attempts: 0,
          lease: null,
          cancelRequested: false,
          result: null,
          error: null,
        }));

      const now = Date.now();
      const job = await store.claimNext('worker-1', { now });
      
      expect(job?.jobId).toBe('job-2');
      expect(job?.status).toBe('running');
      expect(job?.startedAt).toBeDefined();
      expect(job?.attempts).toBe(1);
      expect(job?.lease).toMatchObject({
        owner: 'worker-1',
        pid: process.pid,
        heartbeatAt: new Date(now).toISOString(),
      });
      expect(fs.default.writeFile).toHaveBeenCalled();
    });

    it('should skip running jobs with fresh leases', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readdir.mockResolvedValue(['job-1.json']);
      fs.default.readFile.mockResolvedValueOnce(JSON.stringify({
        jobId: 'job-1',
        task: 'Task 1',
        status: 'running',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: '2024-01-01T01:00:00Z',
        completedAt: null,
        attempts: 1,
        lease: { owner: 'worker-1', pid: process.pid, heartbeatAt: new Date().toISOString() },
        cancelRequested: false,
        result: null,
        error: null,
      }));

      const job = await store.claimNext('worker-2', { leaseStaleAfterMs: 120_000 });
      expect(job).toBeNull();
    });

    it('should fail stale running jobs instead of replaying possible side effects', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readdir.mockResolvedValue(['job-1.json']);
      fs.default.readFile.mockResolvedValueOnce(JSON.stringify({
        jobId: 'job-1',
        task: 'Task 1',
        status: 'running',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: '2024-01-01T01:00:00Z',
        completedAt: null,
        attempts: 1,
        lease: { owner: 'worker-1', pid: process.pid, heartbeatAt: new Date(Date.now() - 150_000).toISOString() },
        cancelRequested: false,
        result: null,
        error: null,
      }));

      const job = await store.claimNext('worker-2', { leaseStaleAfterMs: 120_000 });
      expect(job).toBeNull();
      const written = fs.default.writeFile.mock.calls.at(-1)?.[1];
      expect(JSON.parse(String(written))).toMatchObject({
        jobId: 'job-1',
        status: 'failed',
        lease: null,
        error: { code: 'JOB_INTERRUPTED' },
      });
    });
  });

  describe('isLeaseStale', () => {
    it('should return false for non-running jobs', () => {
      expect(store.isLeaseStale({ status: 'pending' } as any, 120_000)).toBe(false);
      expect(store.isLeaseStale({ status: 'completed' } as any, 120_000)).toBe(false);
    });

    it('should return true for running jobs without lease', () => {
      expect(store.isLeaseStale({ status: 'running', lease: null } as any, 120_000)).toBe(true);
    });

    it('should return true for stale leases', () => {
      // Use a fixed timestamp to avoid timezone issues
      const oldTime = new Date(Date.now() - 150_000).toISOString();
      expect(store.isLeaseStale(
        { status: 'running', lease: { owner: 'worker', pid: 1, heartbeatAt: oldTime } } as any,
        120_000
      )).toBe(true);
    });

    it('should return false for fresh leases', () => {
      expect(store.isLeaseStale(
        { status: 'running', lease: { owner: 'worker', pid: 1, heartbeatAt: new Date().toISOString() } } as any,
        120_000
      )).toBe(false);
    });
  });

  describe('renewLease', () => {
    it('should renew lease for matching owner', async () => {
      const fs = await import('node:fs/promises');
      const original = {
        jobId: 'job-123',
        task: 'Test',
        status: 'running',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: '2024-01-01T01:00:00Z',
        completedAt: null,
        attempts: 1,
        lease: { owner: 'worker-1', pid: process.pid, heartbeatAt: '2024-01-01T01:00:00Z' },
        cancelRequested: false,
        result: null,
        error: null,
      };

      fs.default.readFile.mockResolvedValue(JSON.stringify(original));
      fs.default.writeFile.mockResolvedValue(undefined);

      const updated = await store.renewLease('job-123', 'worker-1');
      
      expect(updated?.lease?.owner).toBe('worker-1');
      expect(updated?.lease?.heartbeatAt).toBeDefined();
      expect(updated?.lease?.pid).toBe(process.pid);
    });

    it('should not renew lease for different owner', async () => {
      const fs = await import('node:fs/promises');
      const original = {
        jobId: 'job-123',
        task: 'Test',
        status: 'running',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: '2024-01-01T01:00:00Z',
        completedAt: null,
        attempts: 1,
        lease: { owner: 'worker-1', pid: process.pid, heartbeatAt: '2024-01-01T01:00:00Z' },
        cancelRequested: false,
        result: null,
        error: null,
      };

      fs.default.readFile.mockResolvedValue(JSON.stringify(original));
      fs.default.writeFile.mockResolvedValue(undefined);

      const updated = await store.renewLease('job-123', 'worker-2');
      
      expect(updated?.jobId).toBe(original.jobId);
      expect(updated?.status).toBe(original.status);
      expect(updated?.lease?.owner).toBe(original.lease?.owner);
      expect(updated?.lease?.pid).toBe(original.lease?.pid);
      expect(updated?.lease?.heartbeatAt).toBe(original.lease?.heartbeatAt);
    });

    it('should return null for non-existent job', async () => {
      const fs = await import('node:fs/promises');
      fs.default.readFile.mockResolvedValue(null);
      const result = await store.renewLease('nonexistent', 'worker-1');
      expect(result).toBeNull();
    });
  });

  describe('finalize', () => {
    it('should finalize a job with result', async () => {
      const fs = await import('node:fs/promises');
      const original = {
        jobId: 'job-123',
        task: 'Test',
        status: 'running',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: '2024-01-01T01:00:00Z',
        completedAt: null,
        attempts: 1,
        lease: { owner: 'worker-1', pid: process.pid, heartbeatAt: '2024-01-01T01:00:00Z' },
        cancelRequested: false,
        result: null,
        error: null,
      };

      fs.default.readFile.mockResolvedValue(JSON.stringify(original));
      fs.default.writeFile.mockResolvedValue(undefined);

      const updated = await store.finalize('job-123', 'worker-1', 'completed', { result: { message: 'Success' } });
      
      expect(updated?.status).toBe('completed');
      expect(updated?.result).toEqual({ message: 'Success' });
      expect(updated?.error).toBeNull();
      expect(updated?.lease).toBeNull();
    });

    it('should throw on non-terminal status', async () => {
      await expect(store.finalize('job-123', 'worker-1', 'pending', {}))
        .rejects.toThrow(RangeError);
    });

    it('should not finalize for wrong owner', async () => {
      const fs = await import('node:fs/promises');
      const original = {
        jobId: 'job-123',
        task: 'Test',
        status: 'running',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: '2024-01-01T01:00:00Z',
        completedAt: null,
        attempts: 1,
        lease: { owner: 'worker-1', pid: process.pid, heartbeatAt: '2024-01-01T01:00:00Z' },
        cancelRequested: false,
        result: null,
        error: null,
      };

      fs.default.readFile.mockResolvedValue(JSON.stringify(original));
      fs.default.writeFile.mockResolvedValue(undefined);

      const updated = await store.finalize('job-123', 'worker-2', 'completed', { result: { message: 'Success' } });
      
      expect(updated?.jobId).toBe(original.jobId);
      expect(updated?.status).toBe(original.status);
      expect(updated?.lease?.owner).toBe(original.lease?.owner);
      expect(updated?.lease?.pid).toBe(original.lease?.pid);
      expect(updated?.lease?.heartbeatAt).toBe(original.lease?.heartbeatAt);
    });
  });

  describe('requestCancel', () => {
    it('should cancel a pending job immediately', async () => {
      const fs = await import('node:fs/promises');
      const original = {
        jobId: 'job-123',
        task: 'Test',
        status: 'pending',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: null,
        completedAt: null,
        attempts: 0,
        lease: null,
        cancelRequested: false,
        result: null,
        error: null,
      };

      fs.default.readFile.mockResolvedValue(JSON.stringify(original));
      fs.default.writeFile.mockResolvedValue(undefined);

      const updated = await store.requestCancel('job-123');
      
      expect(updated?.status).toBe('cancelled');
      expect(updated?.completedAt).toBeDefined();
      expect(updated?.error).toMatchObject({
        code: 'JOB_CANCELLED',
        message: 'Cancelled before the job started.',
      });
    });

    it('should set cancelRequested flag for running job', async () => {
      const fs = await import('node:fs/promises');
      const original = {
        jobId: 'job-123',
        task: 'Test',
        status: 'running',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: '2024-01-01T01:00:00Z',
        completedAt: null,
        attempts: 1,
        lease: { owner: 'worker-1', pid: process.pid, heartbeatAt: '2024-01-01T01:00:00Z' },
        cancelRequested: false,
        result: null,
        error: null,
      };

      fs.default.readFile.mockResolvedValue(JSON.stringify(original));
      fs.default.writeFile.mockResolvedValue(undefined);

      const updated = await store.requestCancel('job-123');
      
      expect(updated?.cancelRequested).toBe(true);
      expect(updated?.status).toBe('running');
    });

    it('should not modify terminal jobs', async () => {
      const fs = await import('node:fs/promises');
      const original = {
        jobId: 'job-123',
        task: 'Test',
        status: 'completed',
        sessionId: 'sess-1',
        projectRoot: '/proj',
        provider: 'chatgpt',
        allowedTools: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        startedAt: '2024-01-01T01:00:00Z',
        completedAt: '2024-01-01T02:00:00Z',
        attempts: 1,
        lease: null,
        cancelRequested: false,
        result: { message: 'Done' },
        error: null,
      };

      fs.default.readFile.mockResolvedValue(JSON.stringify(original));
      fs.default.writeFile.mockResolvedValue(undefined);

      const updated = await store.requestCancel('job-123');
      
      expect(updated?.jobId).toBe(original.jobId);
      expect(updated?.status).toBe(original.status);
      expect(updated?.cancelRequested).toBe(original.cancelRequested);
      expect(updated?.result).toEqual(original.result);
    });
  });
});
