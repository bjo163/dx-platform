import { describe, it, expect, vi } from 'vitest';

import type { JobServiceOptions, JobCreateOptions, JobStatusResponse, JobProgress } from '../src/job-service';
import type { JobRecord, JobStatus, JobLease } from '../src/job-store';

describe('JobService interfaces', () => {
  it('should define JobServiceOptions interface', () => {
    // Test that the interface can be used
    const options: JobServiceOptions = {
      defaultAllowedTools: ['fs.read', 'terminal.exec'],
      provider: 'openai',
      pollIntervalMs: 1000,
    };
    expect(options).toBeDefined();
    expect(options.defaultAllowedTools).toEqual(['fs.read', 'terminal.exec']);
    expect(options.provider).toBe('openai');
    expect(options.pollIntervalMs).toBe(1000);
  });

  it('should define JobCreateOptions interface', () => {
    const options: JobCreateOptions = {
      task: 'test task',
      provider: 'openai',
    };
    expect(options).toBeDefined();
    expect(options.task).toBe('test task');
    expect(options.provider).toBe('openai');
  });

  it('should define JobStatusResponse interface', () => {
    const status: JobStatusResponse = {
      jobId: 'test-job-1',
      task: 'test task',
      status: 'queued' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(status).toBeDefined();
    expect(status.jobId).toBe('test-job-1');
    expect(status.task).toBe('test task');
    expect(status.status).toBe('queued');
  });

  it('should define JobProgress interface', () => {
    const progress: JobProgress = {
      turn: 1,
      phase: 'planning',
      runCount: 0,
    };
    expect(progress).toBeDefined();
    expect(progress.turn).toBe(1);
    expect(progress.phase).toBe('planning');
    expect(progress.runCount).toBe(0);
  });
});
