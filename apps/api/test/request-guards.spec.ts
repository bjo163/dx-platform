import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildApp } from '../src/app';
import type { JobService } from '@dx-platform/job';
import type { WTagentDatabase } from '@dx-platform/database';

const jobService = {
  createJob: vi.fn().mockResolvedValue({ jobId: 'job-1', status: 'pending' }),
} as unknown as JobService;

// Job creation refuses to run until the provider reports authenticated, so the guard
// tests need a database stub that clears that check and reaches the rate limiter.
const database = {
  listProviders: vi.fn().mockResolvedValue([
    { provider_id: 'chatgpt', configured: true, authenticated: true, updated_at: new Date().toISOString(), details: {} },
  ]),
} as unknown as WTagentDatabase;

async function ping(app: FastifyInstance): Promise<number> {
  const response = await app.inject({ method: 'GET', url: '/health' });
  return response.statusCode;
}

describe('create-job rate limit (DX2-0113)', () => {
  let app: FastifyInstance;
  let root: string;

  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'wtagent-ratelimit-')));
    app = await buildApp({
      jobService,
      database,
      projectRoot: root,
      logger: false,
      rateLimitOptions: {
        global: { maxRequests: 1000, windowMs: 60000 },
        auth: { maxRequests: 1000, windowMs: 60000 },
        createJob: { maxRequests: 3, windowMs: 60000 },
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it('accepts requests up to the budget, then answers 429 deterministically', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await app.inject({ method: 'POST', url: '/v1/jobs', payload: { task: `task ${attempt}` } });
      expect(response.statusCode).toBe(201);
    }

    const blocked = await app.inject({ method: 'POST', url: '/v1/jobs', payload: { task: 'overflow' } });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error.code).toBe('RATE_LIMIT');
    expect(Number(blocked.headers['x-ratelimit-limit'])).toBe(3);
    expect(Number(blocked.headers['x-ratelimit-remaining'])).toBe(0);
  });

  it('does not let the create-job budget starve other routes', async () => {
    expect(await ping(app)).toBe(200);
  });

  it('reports the create-job budget instead of the global one', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/jobs', payload: { task: 'again' } });
    expect(response.statusCode).toBe(429);
    expect(Number(response.headers['x-ratelimit-limit'])).toBe(3);
  });
});

describe('request body size limit (DX2-0114)', () => {
  let app: FastifyInstance;
  let root: string;

  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'wtagent-bodylimit-')));
    app = await buildApp({ jobService, projectRoot: root });
  });

  afterAll(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it('rejects a body larger than the configured limit before parsing it', async () => {
    jobService.createJob.mockClear();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/jobs',
      payload: { task: 'x'.repeat(3 * 1024 * 1024) },
    });

    expect(response.statusCode).toBe(413);
    expect(jobService.createJob).not.toHaveBeenCalled();
  });
});
