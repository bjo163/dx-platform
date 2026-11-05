import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Writable } from 'node:stream';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { buildApp } from '../src/app';
import { generateJwt } from '@dx-platform/shared/jwt';
import type { JobService } from '@dx-platform/job';
import type { WTagentDatabase } from '@dx-platform/database';

// Every value below is a fake fixture, never a real credential.
const FAKE_SESSION_COOKIE = 'session=FAKE-COOKIE-VALUE-DO-NOT-USE';
const FAKE_API_KEY = 'sk-FAKEKEYVALUENOTREAL';
const FAKE_QUERY_TOKEN = 'FAKE-QUERY-TOKEN-DO-NOT-USE';
const JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';

const captured: string[] = [];
// Pino writes the serialized record to the provided stream; capturing it lets these
// tests assert on the exact text the operator would see in a log file.
const sink = new Writable({
  write(chunk: Buffer | string, _encoding, callback) {
    captured.push(chunk.toString());
    callback();
  },
});

const jobService = {
  listJobs: vi.fn().mockResolvedValue([]),
  createJob: vi.fn(),
} as unknown as JobService;

const database = {
  listProviders: vi.fn().mockResolvedValue([]),
} as unknown as WTagentDatabase;

describe('log redaction (DX2-0108, DX2-0109, DX2-0110)', () => {
  let app: FastifyInstance;
  let root: string;

  beforeAll(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'wtagent-redaction-')));
    app = await buildApp({
      jobService,
      database,
      projectRoot: root,
      jwtSecret: JWT_SECRET,
      logger: { level: 'debug', stream: sink },
    });

    await app.inject({
      method: 'GET',
      url: `/health?token=${FAKE_QUERY_TOKEN}&api_key=${FAKE_API_KEY}&keep=visible`,
      headers: {
        authorization: `Bearer ${generateJwt({ sub: 'tenant-1' }, { secret: JWT_SECRET })}`,
        cookie: FAKE_SESSION_COOKIE,
        'x-api-key': FAKE_API_KEY,
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it('captured log lines for the request', () => {
    expect(captured.join('\n')).toContain('/health');
  });

  it('keeps the bearer token out of the log', () => {
    const log = captured.join('\n');
    expect(log).not.toContain('eyJ');
    expect(log).not.toContain('tenant-1');
  });

  it('keeps the session cookie out of the log', () => {
    expect(captured.join('\n')).not.toContain(FAKE_SESSION_COOKIE);
  });

  it('keeps the api key out of the log', () => {
    expect(captured.join('\n')).not.toContain(FAKE_API_KEY);
  });

  it('keeps the secret query value out of the log but keeps harmless params', () => {
    const log = captured.join('\n');
    expect(log).not.toContain(FAKE_QUERY_TOKEN);
    expect(log).toContain('keep=visible');
  });

  it('marks the redacted fields instead of dropping the record', () => {
    expect(captured.join('\n')).toContain('[REDACTED]');
  });

  it('does not serialize the raw socket or its copied headers', () => {
    // A shallow spread of the Fastify request exposes `raw`, which carries the same
    // headers in `rawHeaders`/`_header` and would defeat header-name matching.
    const log = captured.join('\n');
    expect(log).not.toContain('rawHeaders');
    expect(log).not.toContain('_header');
  });
});
