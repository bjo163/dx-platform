import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { JobService } from '@wtagent/job';
import { createJobService } from '@wtagent/job';
import { WTagentDatabase } from '@wtagent/database';
import type { JobService as JobServiceType } from '@wtagent/job';
import type { WTagentDatabase as WTagentDatabaseType } from '@wtagent/database';
import fastify from 'fastify';
import { getAppDataDir } from '@wtagent/platform/paths';
import { generateJwt } from '@wtagent/shared/jwt';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Mock services
const mockJobService = {
  listJobs: vi.fn(),
  listByProject: vi.fn().mockResolvedValue([]),
  listByProjectAndStatus: vi.fn().mockResolvedValue([]),
  listActivity: vi.fn().mockResolvedValue([]),
  createJob: vi.fn(),
  cancelJob: vi.fn(),
  retryJob: vi.fn(),
  getJob: vi.fn(),
  getJobStatus: vi.fn(),
  getJobLogs: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
} as unknown as JobService;

const mockDatabase = {
  listProviders: vi.fn().mockResolvedValue([{
    provider_id: 'chatgpt',
    configured: true,
    authenticated: true,
    updated_at: new Date().toISOString(),
    details: { profileDir: '/tmp/test' }
  }]),
  setProvider: vi.fn().mockResolvedValue(undefined),
  getProfile: vi.fn().mockResolvedValue(undefined),
  setProfile: vi.fn().mockResolvedValue(undefined),
  listPlugins: vi.fn().mockResolvedValue([]),
  setPlugin: vi.fn().mockResolvedValue(undefined),
  listProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn().mockResolvedValue(undefined),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  listPluginsByProject: vi.fn().mockResolvedValue([]),
  client: {
    dumpDataDir: vi.fn().mockResolvedValue(new Blob([Uint8Array.of(0x1f, 0x8b)])),
  },
} as unknown as WTagentDatabase;

describe('API Integration Tests', () => {
  let app: fastify.FastifyInstance;
  const testDir = path.join(os.tmpdir(), 'wtagent-test-' + Date.now());

  beforeAll(async () => {
    // Create test temp directory
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'src', 'example.ts'), 'export const answer = 42;\n');
    
    // Mock environment
    process.env.PORT = '0'; // Use random port
    process.env.WTAGENT_DATA_DIR = testDir;
    
    // Mock JobService
    mockJobService.listJobs.mockResolvedValue([]);
    mockJobService.createJob.mockResolvedValue({
      jobId: 'test-job-123',
      task: 'Test task',
      status: 'pending',
      sessionId: 'test-session',
      projectRoot: testDir,
      provider: 'chatgpt',
      allowedTools: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      attempts: 0,
      lease: null,
      cancelRequested: false,
      result: null,
      error: null,
    });
    mockJobService.cancelJob.mockResolvedValue({
      jobId: 'test-job-123',
      task: 'Test task',
      status: 'cancelled',
      sessionId: 'test-session',
      projectRoot: testDir,
      provider: 'chatgpt',
      allowedTools: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: new Date().toISOString(),
      attempts: 0,
      lease: null,
      cancelRequested: false,
      result: null,
      error: null,
    });
    mockJobService.retryJob.mockResolvedValue({
      jobId: 'test-job-123',
      task: 'Test task',
      status: 'pending',
      sessionId: 'test-session',
      projectRoot: testDir,
      provider: 'chatgpt',
      allowedTools: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      attempts: 0,
      lease: null,
      cancelRequested: false,
      result: null,
      error: null,
    });
    mockJobService.getJob.mockImplementation((id) => {
      if (id === 'test-job-123') {
        return Promise.resolve({
          jobId: 'test-job-123',
          task: 'Test task',
          status: 'pending',
          sessionId: 'test-session',
          projectRoot: testDir,
          provider: 'chatgpt',
          allowedTools: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
          attempts: 0,
          lease: null,
          cancelRequested: false,
          result: null,
          error: null,
        });
      }
      return Promise.resolve(null);
    });
    mockJobService.getJobStatus.mockResolvedValue({
      jobId: 'test-job-123',
      task: 'Test task',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      attempts: 0,
      allowedTools: [],
      progress: { turn: 0, phase: 'initialized', runCount: 0 },
      result: null,
      error: null,
    });
    mockJobService.getJobLogs.mockResolvedValue({
      jobId: 'test-job-123',
      transcript: [],
      stdout: '',
      stderr: '',
      events: [],
      toolOutputs: [],
    });
    
    // Build app
    app = await buildApp({
      jobService: mockJobService,
      database: mockDatabase,
      dataDir: testDir,
      projectRoot: testDir,
    });
    
    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    // Update process.env.PORT with actual port
    const port = address.split(':').pop();
    process.env.PORT = port;
  });

  afterAll(async () => {
    await app.close();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Health endpoints', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      describe('Workspace endpoints', () => {
        it('reports the configured project root and lists real project files', async () => {
          const workspace = await app.inject({ method: 'GET', url: '/v1/workspace' });
          expect(workspace.statusCode).toBe(200);
          expect(workspace.json()).toEqual({
            id: 'default',
            name: path.basename(testDir),
            path: testDir,
          });

          describe('Authentication', () => {
            it('requires a valid bearer token whenever JWT authentication is configured', async () => {
              const authenticatedApp = await buildApp({
                jobService: mockJobService,
                projectRoot: testDir,
                jwtSecret: 'test-secret-with-more-than-thirty-two-characters',
              });
              try {
                const preflight = await authenticatedApp.inject({
                  method: 'OPTIONS',
                  url: '/health',
                  headers: { origin: 'http://localhost:3000' },
                });
                expect(preflight.statusCode).toBe(204);

                const missing = await authenticatedApp.inject({ method: 'GET', url: '/health' });
                expect(missing.statusCode).toBe(401);

                const invalid = await authenticatedApp.inject({
                  method: 'GET',
                  url: '/health',
                  headers: { authorization: 'Bearer invalid' },
                });
                expect(invalid.statusCode).toBe(401);

                const valid = await authenticatedApp.inject({
                  method: 'GET',
                  url: '/health',
                  headers: {
                    authorization: `Bearer ${generateJwt({ sub: 'test' }, { secret: 'test-secret-with-more-than-thirty-two-characters' })}`,
                  },
                });
                expect(valid.statusCode).toBe(200);
              } finally {
                await authenticatedApp.close();
              }
            });
          });

          const listing = await app.inject({ method: 'GET', url: '/v1/workspace/files?path=src' });
          expect(listing.statusCode).toBe(200);
          expect(listing.json().entries).toEqual([
            { name: 'example.ts', type: 'file', path: 'src/example.ts' },
          ]);
        });

        it('previews text files without allowing paths outside the project', async () => {
          const preview = await app.inject({ method: 'GET', url: '/v1/workspace/file?path=src%2Fexample.ts' });
          expect(preview.statusCode).toBe(200);
          expect(preview.json()).toEqual({
            path: 'src/example.ts',
            content: 'export const answer = 42;\n',
          });

          const outside = await app.inject({ method: 'GET', url: '/v1/workspace/file?path=..%2F..%2Foutside.txt' });
          expect(outside.statusCode).toBe(400);
          expect(outside.json().error.code).toBe('INVALID_PATH');
        });
      });

      describe('Backup endpoints', () => {
        it('creates a backup under the configured WTAgent data directory', async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/v1/backups',
          });

          expect(response.statusCode).toBe(201);
          const result = response.json();
          expect(result.path).toContain(path.join(testDir, 'backups'));
          expect(result.fileCount).toBe(1);
          const manifest = JSON.parse(await fs.readFile(path.join(result.path, 'manifest.json'), 'utf8'));
          expect(manifest).toMatchObject({
            format: 'wtagent-pglite-backup',
            version: 1,
            files: [{ path: 'database.pglite.tar.gz' }],
          });
        });
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toMatchObject({
        status: 'ok',
        port: Number(process.env.PORT),
      });
    });
  });

  describe('Providers endpoints', () => {
    it('should list providers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/providers',
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return 404 for unavailable provider', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/providers/unknown/login',
      });
      
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Jobs endpoints', () => {
    it('should create a job', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/jobs',
        payload: {
          task: 'Test task',
          provider: 'chatgpt',
          projectRoot: path.join(testDir, 'outside'),
        },
      });
      
      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data.jobId).toBe('test-job-123');
      expect(data.task).toBe('Test task');
      expect(data.status).toBe('pending');
      expect(mockJobService.createJob).toHaveBeenLastCalledWith(expect.objectContaining({
        projectRoot: testDir,
      }));
      expect(mockJobService.createJob.mock.calls.at(-1)?.[0]).not.toHaveProperty('allowedTools');
    });

    it('does not let API clients grant tools to background jobs', async () => {
      mockJobService.createJob.mockClear();
      const response = await app.inject({
        method: 'POST',
        url: '/v1/jobs',
        payload: {
          task: 'edit a file',
          provider: 'chatgpt',
          allowedTools: ['fs.write', 'terminal.exec'],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('UNSUPPORTED_FIELD');
      expect(mockJobService.createJob).not.toHaveBeenCalled();
    });

    it('should list jobs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/jobs',
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('does not expose internal failure details in API responses', async () => {
      mockJobService.listJobs.mockRejectedValueOnce(
        new Error('sensitive database path: C:\\private\\secret.pglite'),
      );
      const response = await app.inject({ method: 'GET', url: '/v1/jobs' });
      expect(response.statusCode).toBe(500);
      expect(response.json().error.message).toBe('The request could not be completed.');
      expect(response.body).not.toContain('secret.pglite');
    });

    it('should list persisted job activity', async () => {
      const response = await app.inject({ method: 'GET', url: '/v1/activity' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
      expect(mockJobService.listActivity).toHaveBeenCalled();
    });

    it('should get job by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/jobs/test-job-123',
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.jobId).toBe('test-job-123');
      expect(data.task).toBe('Test task');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/jobs/non-existent',
      });
      
      expect(response.statusCode).toBe(404);
    });

    it('should cancel a job', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/jobs/test-job-123/cancel',
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.status).toBe('cancelled');
    });

    it('should retry a job', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/jobs/test-job-123/retry',
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.status).toBe('pending');
    });

    it('should stream job events', async () => {
      mockJobService.getJobStatus.mockResolvedValueOnce({
        jobId: 'test-job-123',
        task: 'Test task',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        attempts: 1,
        allowedTools: [],
        result: null,
        error: null,
      });
      const response = await app.inject({
        method: 'GET',
        url: '/v1/jobs/test-job-123/events',
      }, { timeout: 10000 });
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should get job logs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/jobs/test-job-123/logs',
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('jobId', 'test-job-123');
    });

    it('should delete a job', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/jobs/test-job-123',
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.status).toBe('cancelled');
    });
  });

  describe('Profile endpoints', () => {
    it('should get profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('profile_id', 'default');
    });

    it('should update profile', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/profile',
        payload: {
          displayName: 'Test User',
        },
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.display_name).toBe('Test User');
    });

    it('should reject invalid profile name', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/profile',
        payload: {
          displayName: ''.padEnd(61, 'a'),
        },
      });
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe('Plugins endpoints', () => {
    it('should list plugins', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/plugins',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it('should update plugin', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/plugins/github',
        payload: {
          enabled: false,
          config: { token: 'test' },
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.id).toBe('github');
      expect(data.enabled).toBe(false);
      expect(data.config).toEqual({ token: 'test' });
    });

    it('should install a plugin for a project', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/registry/projects/default/plugins/github/install',
        payload: { version: '2.0.0' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.pluginId).toBe('github');
      expect(data.projectId).toBe('default');
      expect(data.installed).toBe(true);
      expect(data.version).toBe('2.0.0');
    });

    it('should uninstall a plugin for a project', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/registry/projects/default/plugins/github',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.pluginId).toBe('github');
      expect(data.projectId).toBe('default');
      expect(data.installed).toBe(false);
    });

    it('should update a plugin for a project', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/registry/projects/default/plugins/github/update',
        payload: { version: '3.0.0' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.pluginId).toBe('github');
      expect(data.updated).toBe(true);
      expect(data.version).toBe('3.0.0');
    });

    it('should list plugins for a project', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/registry/projects/default/plugins',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should list all registry plugins', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/registry/plugins',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Project management endpoints', () => {
    it('should list projects', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/projects',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should create a project', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/projects',
        payload: {
          projectId: 'test-project',
          name: 'Test Project',
          description: 'A test project',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.projectId).toBe('test-project');
      expect(data.name).toBe('Test Project');
    });

    it('should reject project creation without projectId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/projects',
        payload: {
          name: 'Test Project',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should delete a project', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/projects/test-project',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.projectId).toBe('test-project');
    });

    it('should list project-scoped jobs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/projects/default/jobs',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Provider status endpoints', () => {
    it('should list provider statuses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/providers/status',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      const chatgpt = data.find((p: { id: string }) => p.id === 'chatgpt');
      expect(chatgpt).toHaveProperty('healthy');
      expect(chatgpt).toHaveProperty('circuitBreaker');
    });

    it('should get individual provider status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/providers/chatgpt/status',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.id).toBe('chatgpt');
      expect(data).toHaveProperty('healthy');
      expect(data).toHaveProperty('circuitBreaker');
    });

    it('should return 404 for unknown provider status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/providers/unknown/status',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Job pool endpoints', () => {
    it('should return pool status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/jobs/pool/status',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('active');
      expect(data).toHaveProperty('workers');
      expect(data).toHaveProperty('quota');
      expect(data.quota).toHaveProperty('maxCpuCores');
      expect(data.quota).toHaveProperty('maxMemoryMb');
      expect(data.quota).toHaveProperty('maxConcurrentJobsPerProject');
      expect(data.quota).toHaveProperty('maxConcurrentJobsPerProvider');
    });
  });

  describe('Artifact preview endpoints', () => {
    it('should return 503 when artifact secret is not configured', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/artifacts/preview',
        payload: {
          artifactId: 'test-artifact',
          localPath: '/tmp/test.png',
          mimeType: 'image/png',
          width: 100,
          height: 100,
          size: 1024,
        },
      });

      expect(response.statusCode).toBe(503);
    });

    it('should return 400 for invalid preview token when secret is configured', async () => {
      process.env.WTAGENT_ARTIFACT_SECRET = 'test-secret-key-12345';
      process.env.WTAGENT_ARTIFACT_TTL_MS = '3600000';
      process.env.WTAGENT_ARTIFACT_THUMBNAIL_SIZE = '256';
      const response = await app.inject({
        method: 'GET',
        url: '/v1/artifacts/preview/invalid-token',
      });

      expect(response.statusCode).toBe(400);
      delete process.env.WTAGENT_ARTIFACT_SECRET;
    });
  });

  describe('Chat endpoints', () => {
    it('lists only active providers as chat-completion models', async () => {
      const response = await app.inject({ method: 'GET', url: '/v1/models' });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toContainEqual(expect.objectContaining({
        id: 'chatgpt',
        capabilities: { chat_completions: true, streaming: false, tools: false, images: false },
      }));
    });

    it('should handle non-streaming chat', async () => {
      const completedJob = {
        jobId: 'completion-job-123',
        task: 'USER:\nHello',
        status: 'completed' as const,
        sessionId: 'completion-session-123',
        projectRoot: testDir,
        allowedTools: [],
        provider: 'chatgpt',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        attempts: 1,
        lease: null,
        cancelRequested: false,
        result: { message: 'Hello from the connected provider.' },
        error: null,
      };
      mockJobService.createJob.mockResolvedValueOnce(completedJob);
      mockJobService.getJob.mockResolvedValueOnce(completedJob);
      const response = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        payload: {
          model: 'chatgpt',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      });
      
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.object).toBe('chat.completion');
      expect(data.choices[0].message.content).toBe('Hello from the connected provider.');
      expect(mockJobService.createJob).toHaveBeenLastCalledWith(expect.objectContaining({
        provider: 'chatgpt',
        projectRoot: testDir,
        task: 'USER:\nHello',
      }));
    });

    it('rejects streaming until the selected adapter supports it', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        payload: {
          model: 'chatgpt',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        },
      });
      
      expect(response.statusCode).toBe(501);
      expect(response.json().error.code).toBe('UNSUPPORTED_CAPABILITY');
    });

    it('validates model identifiers and required OpenAI-compatible fields', async () => {
      const unknownModel = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        payload: { model: 'unknown', messages: [{ role: 'user', content: 'Hello' }] },
      });
      expect(unknownModel.statusCode).toBe(404);
      expect(unknownModel.json().error.code).toBe('MODEL_NOT_FOUND');

      const missingModel = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        payload: { messages: [{ role: 'user', content: 'Hello' }] },
      });
      expect(missingModel.statusCode).toBe(400);

      const unsupportedField = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        payload: { model: 'chatgpt', messages: [{ role: 'user', content: 'Hello' }], temperature: 0.4 },
      });
      expect(unsupportedField.statusCode).toBe(400);
    });
  });
});