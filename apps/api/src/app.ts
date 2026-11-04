import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { JobService } from "@wtagent/job";
import { createWTagentBackup, type WTagentDatabase } from "@wtagent/database";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { extractJwtFromHeader, verifyJwt, JwtResult } from "@wtagent/shared/jwt";
import { createRateLimiter, type RateLimitRequest } from "@wtagent/shared/rate-limit";
import { createCorsValidator, type CorsOptions } from "@wtagent/shared/cors";
import { executeGatewayChatCompletion } from "@wtagent/gateway";
import {
  createWebAdapter,
  findProvider,
  getProviderProfileDir,
  launchNativeLoginBrowser,
  PROVIDERS,
} from "@wtagent/browser";
import { getAppDataDir } from "@wtagent/platform/paths";
import type { JobStatus } from "@wtagent/job";

export interface BuildAppOptions {
  jobService: JobService;
  database?: WTagentDatabase;
  dataDir?: string;
  projectRoot?: string;
  jwtSecret?: string;
  corsOptions?: CorsOptions;
  rateLimitOptions?: {
    global: {
      maxRequests: number;
      windowMs: number;
    };
    auth: {
      maxRequests: number;
      windowMs: number;
    };
  };
}

const WORKSPACE_PREVIEW_MAX_BYTES = 256 * 1024;
const WORKSPACE_IGNORED_ENTRIES = new Set([".git", ".wtagent", "node_modules"]);

function isWithinDirectory(directory: string, target: string): boolean {
  const relative = path.relative(directory, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function resolveWorkspacePath(root: string, requestedPath: string): string | null {
  const target = path.resolve(root, requestedPath);
  return isWithinDirectory(root, target) ? target : null;
}

async function realPathOrNull(target: string): Promise<string | null> {
  try {
    return await fs.realpath(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: true, ajv: { customOptions: { removeAdditional: false } } });
  const loginBrowsers = new Map<string, { close(): Promise<void> }>();
  const projectRoot = await fs.realpath(options.projectRoot ?? process.cwd());
  if (!(await fs.stat(projectRoot)).isDirectory()) {
    throw new TypeError("The configured project root must be a directory.");
  }

  // Security middleware
  const corsValidator = createCorsValidator(options.corsOptions);
  const globalRateLimiter = options.rateLimitOptions?.global
    ? createRateLimiter(options.rateLimitOptions.global)
    : createRateLimiter({ maxRequests: 100, windowMs: 60000 }); // 100/min default
  const authRateLimiter = options.rateLimitOptions?.auth
    ? createRateLimiter(options.rateLimitOptions.auth)
    : createRateLimiter({ maxRequests: 10, windowMs: 60000 }); // 10/min default

  app.addHook("onRequest", async (request, reply) => {
    // Rate limiting
    const rateLimitRequest: RateLimitRequest = {
      ip: request.ip ?? "unknown",
      url: request.url,
      method: request.method,
      headers: request.headers as Record<string, string>,
    };

    const isAuthEndpoint = request.url.startsWith("/v1/providers/") && request.method === "POST";
    const limiter = isAuthEndpoint ? authRateLimiter : globalRateLimiter;
    const rateLimitResult = limiter.check(rateLimitRequest);

    if (!rateLimitResult.allowed) {
      reply.header("X-RateLimit-Limit", rateLimitResult.limit);
      reply.header("X-RateLimit-Remaining", rateLimitResult.remaining);
      reply.header("X-RateLimit-Reset", rateLimitResult.resetAt);
      return reply.code(429).send({
        error: { code: "RATE_LIMIT", message: "Rate limit exceeded" },
      });
    }

    reply.header("X-RateLimit-Limit", rateLimitResult.limit);
    reply.header("X-RateLimit-Remaining", rateLimitResult.remaining);
    reply.header("X-RateLimit-Reset", rateLimitResult.resetAt);

    // CORS validation
    const origin = request.headers.origin;
    if (origin) {
      const corsResult = corsValidator.validateOrigin(origin);
      if (!corsResult.allowed) {
        return reply.code(403).send({
          error: { code: "CORS_ERROR", message: "Origin not allowed" },
        });
      }
      reply.headers(corsResult.headers);
    }

    // Optional JWT auth
    if (options.jwtSecret && request.method !== "OPTIONS") {
      const authHeader = request.headers.authorization;
      const token = extractJwtFromHeader(authHeader);
      if (!token) {
        return reply.code(401).send({
          error: { code: "UNAUTHORIZED", message: "A bearer token is required." },
        });
      }
      const result = verifyJwt(token, { secret: options.jwtSecret });
      if (!result.valid) {
        return reply.code(401).send({
          error: { code: "UNAUTHORIZED", message: "Invalid token." },
        });
      }
    }
  });

  app.options("*", async (_request, reply) => {
    reply
      .header("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS")
      .header("access-control-allow-headers", "Content-Type, Authorization, Idempotency-Key")
      .status(204)
      .send();
  });

  app.get("/health", async () => ({
    status: "ok",
    port: Number(process.env.PORT ?? 8080),
  }));

  app.get("/v1/workspace", async () => ({
    id: "default",
    name: path.basename(projectRoot),
    path: projectRoot,
  }));

  app.get<{ Querystring: { path?: string } }>("/v1/workspace/files", async (request, reply) => {
    const requestedPath = request.query.path ?? ".";
    const target = resolveWorkspacePath(projectRoot, requestedPath);
    if (!target) {
      return reply.code(400).send({ error: { code: "INVALID_PATH", message: "Path must stay inside the selected project." } });
    }
    const realTarget = await realPathOrNull(target);
    if (!realTarget) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Directory not found." } });
    if (!isWithinDirectory(projectRoot, realTarget)) {
      return reply.code(400).send({ error: { code: "INVALID_PATH", message: "Path must stay inside the selected project." } });
    }
    if (!(await fs.stat(realTarget)).isDirectory()) {
      return reply.code(400).send({ error: { code: "NOT_DIRECTORY", message: "Path is not a directory." } });
    }

    const entries = await fs.readdir(realTarget, { withFileTypes: true });
    return {
      path: path.relative(projectRoot, realTarget).split(path.sep).join("/"),
      entries: entries
        .filter((entry) => !entry.isSymbolicLink() && !WORKSPACE_IGNORED_ENTRIES.has(entry.name))
        .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name))
        .slice(0, 300)
        .map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
          path: path.relative(projectRoot, path.join(realTarget, entry.name)).split(path.sep).join("/"),
        })),
    };
  });

  app.get<{ Querystring: { path: string } }>("/v1/workspace/file", async (request, reply) => {
    const target = resolveWorkspacePath(projectRoot, request.query.path ?? "");
    if (!target) {
      return reply.code(400).send({ error: { code: "INVALID_PATH", message: "Path must stay inside the selected project." } });
    }
    const realTarget = await realPathOrNull(target);
    if (!realTarget) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "File not found." } });
    if (!isWithinDirectory(projectRoot, realTarget)) {
      return reply.code(400).send({ error: { code: "INVALID_PATH", message: "Path must stay inside the selected project." } });
    }
    const stats = await fs.stat(realTarget);
    if (!stats.isFile()) return reply.code(400).send({ error: { code: "NOT_FILE", message: "Path is not a file." } });
    if (stats.size > WORKSPACE_PREVIEW_MAX_BYTES) {
      return reply.code(413).send({ error: { code: "FILE_TOO_LARGE", message: "File preview is limited to 256 KiB." } });
    }
    const contents = await fs.readFile(realTarget);
    if (contents.includes(0)) {
      return reply.code(415).send({ error: { code: "BINARY_FILE", message: "Binary file preview is not supported." } });
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(contents);
    } catch (error) {
      if (error instanceof TypeError) {
        return reply.code(415).send({ error: { code: "INVALID_TEXT", message: "File is not valid UTF-8 text." } });
      }
      throw error;
    }
    return {
      path: path.relative(projectRoot, realTarget).split(path.sep).join("/"),
      content: text,
    };
  });

  app.post("/v1/backups", async (request, reply) => {
    if (!options.database || !options.dataDir) {
      return reply.code(503).send({
        error: { code: "BACKUP_UNAVAILABLE", message: "Database backup is not configured." },
      });
    }
    const createdAt = new Date();
    const backupName = `wtagent-${createdAt.toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`;
    const result = await createWTagentBackup({
      database: options.database,
      sessionsDir: path.join(options.dataDir, "sessions"),
      destinationDir: path.join(options.dataDir, "backups", backupName),
    });
    return reply.code(201).send(result);
  });

  app.get("/v1/jobs", async () => options.jobService.listJobs());

  app.get("/v1/activity", async () => options.jobService.listActivity());

  app.get("/v1/providers", async () => {
    const states = options.database ? await options.database.listProviders() : [];
    const stateById = new Map(states.map((state) => [String(state.provider_id), state]));
    const appDataDir = getAppDataDir();
    return Object.values(PROVIDERS).map((provider) => {
      const state = stateById.get(provider.id);
      const profileDir = getProviderProfileDir(appDataDir, provider.id);
      return {
        id: provider.id,
        name: provider.label,
        configured: Boolean(state?.configured ?? existsSync(profileDir)),
        authenticated: Boolean(state?.authenticated),
        supported: provider.status === "active",
        loginUrl: provider.baseUrl,
        guidance: provider.status === "active"
          ? "Connect using a dedicated local browser profile."
          : "Provider support is not enabled yet.",
        lastVerifiedAt: state?.updated_at ?? null,
      };
    });
  });

  app.post<{ Params: { id: string } }>("/v1/providers/:id/login", async (request, reply) => {
    const provider = findProvider(request.params.id);
    if (!provider || provider.status !== "active") {
      return reply.code(404).send({ error: { code: "PROVIDER_UNAVAILABLE", message: "Provider is unavailable." } });
    }
    const profileDir = getProviderProfileDir(getAppDataDir(), provider.id);
    const existing = loginBrowsers.get(provider.id);
    if (!existing) {
      const browser = await launchNativeLoginBrowser({ profileDir, url: provider.baseUrl });
      loginBrowsers.set(provider.id, browser);
    }
    await options.database?.setProvider(provider.id, "default", {
      configured: true,
      authenticated: false,
      details: { profileDir },
    });
    return { id: provider.id, status: "connecting" };
  });

  app.post<{ Params: { id: string } }>("/v1/providers/:id/verify", async (request, reply) => {
    const provider = findProvider(request.params.id);
    if (!provider || provider.status !== "active") {
      return reply.code(404).send({ error: { code: "PROVIDER_UNAVAILABLE", message: "Provider is unavailable." } });
    }
    const profileDir = getProviderProfileDir(getAppDataDir(), provider.id);
    await loginBrowsers.get(provider.id)?.close();
    loginBrowsers.delete(provider.id);
    const adapter = createWebAdapter({ provider, profileDir });
    let authenticated = false;
    try {
      await adapter.launch();
      authenticated = await adapter.getAuthState() === "authenticated";
    } finally {
      await adapter.close();
    }
    await options.database?.setProvider(provider.id, "default", {
      configured: true,
      authenticated,
      details: { profileDir },
    });
    return { id: provider.id, authenticated };
  });

  app.delete<{ Params: { id: string } }>("/v1/providers/:id", async (request, reply) => {
    const provider = findProvider(request.params.id);
    if (!provider) return reply.code(404).send({ error: { code: "PROVIDER_UNAVAILABLE", message: "Provider is unavailable." } });
    await loginBrowsers.get(provider.id)?.close();
    loginBrowsers.delete(provider.id);
    const profileDir = getProviderProfileDir(getAppDataDir(), provider.id);
    await fs.rm(profileDir, { recursive: true, force: true });
    await options.database?.setProvider(provider.id, "default", {
      configured: false,
      authenticated: false,
      details: { profileDir },
    });
    return { id: provider.id, authenticated: false };
  });

  // Project management endpoints
  app.get("/v1/projects", async () => {
    const projects = await options.database?.listProjects() ?? [];
    return projects;
  });

  app.post<{ Body: { projectId: string; name: string; description?: string } }>("/v1/projects", async (request, reply) => {
    const { projectId, name, description = "" } = request.body;
    if (!projectId || !name) {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "projectId and name are required" } });
    }
    await options.database?.createProject(projectId, name, description);
    return { projectId, name, description };
  });

  app.delete<{ Params: { projectId: string } }>("/v1/projects/:projectId", async (request, reply) => {
    const projectId = request.params.projectId;
    if (!projectId) return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "projectId is required" } });
    await options.database?.deleteProject(projectId);
    return { projectId };
  });

  // Project-scoped jobs
  app.get<{ Params: { projectId: string }; Querystring: { status?: string } }>("/v1/projects/:projectId/jobs", async (request, reply) => {
    const projectId = request.params.projectId;
    const status = request.query.status;
    if (status) {
      const jobs = await options.jobService.listByProjectAndStatus(projectId, status as JobStatus);
      return jobs;
    }
    const jobs = await options.jobService.listByProject(projectId);
    return jobs;
  });

  // Plugin registry endpoints
  app.get("/v1/registry/plugins", async () => {
    const plugins = await options.database?.listPlugins() ?? [];
    return plugins;
  });

  app.get<{ Params: { projectId: string } }>("/v1/registry/projects/:projectId/plugins", async (request, reply) => {
    const projectId = request.params.projectId;
    const plugins = await options.database?.listPluginsByProject(projectId) ?? [];
    return plugins;
  });

  app.put<{ Params: { pluginId: string; projectId: string }; Body: { enabled?: boolean; config?: unknown } }>("/v1/registry/projects/:projectId/plugins/:pluginId", async (request) => {
    const { pluginId, projectId } = request.params;
    const { enabled = true, config = {} } = request.body;
    if (!options.database) throw new Error("Database is not available.");
    await options.database.setPlugin(pluginId, projectId, enabled, config);
    return { pluginId, projectId, enabled, config };
  });

  app.post<{ Params: { pluginId: string; projectId: string }; Body: { version?: string } }>("/v1/registry/projects/:projectId/plugins/:pluginId/install", async (request, reply) => {
    const { pluginId, projectId } = request.params;
    const version = request.body.version ?? "1.0.0";
    if (!options.database) throw new Error("Database is not available.");
    await options.database.setPlugin(pluginId, projectId, true, { version, installedAt: new Date().toISOString() });
    return { pluginId, projectId, installed: true, version };
  });

  app.delete<{ Params: { pluginId: string; projectId: string } }>("/v1/registry/projects/:projectId/plugins/:pluginId", async (request, reply) => {
    const { pluginId, projectId } = request.params;
    if (!options.database) throw new Error("Database is not available.");
    await options.database.setPlugin(pluginId, projectId, false, {});
    return { pluginId, projectId, installed: false };
  });

  app.post<{ Params: { pluginId: string; projectId: string }; Body: { version?: string } }>("/v1/registry/projects/:projectId/plugins/:pluginId/update", async (request, reply) => {
    const { pluginId, projectId } = request.params;
    const version = request.body.version ?? "1.0.0";
    if (!options.database) throw new Error("Database is not available.");
    await options.database.setPlugin(pluginId, projectId, true, { version, installedAt: new Date().toISOString(), updated: true });
    return { pluginId, projectId, updated: true, version };
  });

  // Provider status panel endpoints
  app.get("/v1/providers/status", async () => {
    const states = options.database ? await options.database.listProviders() : [];
    const stateById = new Map(states.map((state) => [String(state.provider_id), state]));
    const appDataDir = getAppDataDir();
    return Object.values(PROVIDERS).map((provider) => {
      const state = stateById.get(provider.id);
      const profileDir = getProviderProfileDir(appDataDir, provider.id);
      const configured = Boolean(state?.configured ?? existsSync(profileDir));
      const authenticated = Boolean(state?.authenticated);
      return {
        id: provider.id,
        name: provider.label,
        status: provider.status,
        configured,
        authenticated,
        lastVerifiedAt: state?.updated_at ?? null,
        healthy: configured && authenticated,
        circuitBreaker: authenticated ? "closed" : "open",
      };
    });
  });

  app.get<{ Params: { id: string } }>("/v1/providers/:id/status", async (request, reply) => {
    const provider = findProvider(request.params.id);
    if (!provider) return reply.code(404).send({ error: { code: "PROVIDER_UNAVAILABLE", message: "Provider is unavailable." } });
    const states = options.database ? await options.database.listProviders() : [];
    const state = states.find((s) => s.provider_id === provider.id);
    const profileDir = getProviderProfileDir(getAppDataDir(), provider.id);
    const configured = Boolean(state?.configured ?? existsSync(profileDir));
    const authenticated = Boolean(state?.authenticated);
    return {
      id: provider.id,
      name: provider.label,
      status: provider.status,
      configured,
      authenticated,
      lastVerifiedAt: state?.updated_at ?? null,
      healthy: configured && authenticated,
      circuitBreaker: authenticated ? "closed" : "open",
    };
  });

  // Job parallelization endpoints
  app.get("/v1/jobs/pool/status", async () => {
    return {
      active: 0,
      workers: Number(process.env.WTAGENT_WORKERS ?? 1),
      quota: {
        maxCpuCores: Number(process.env.WTAGENT_MAX_CPU ?? 4),
        maxMemoryMb: Number(process.env.WTAGENT_MAX_MEMORY_MB ?? 2048),
        maxConcurrentJobsPerProject: Number(process.env.WTAGENT_MAX_PER_PROJECT ?? 2),
        maxConcurrentJobsPerProvider: Number(process.env.WTAGENT_MAX_PER_PROVIDER ?? 2),
      },
    };
  });

  // Legacy plugin endpoints (backward compatibility)
  app.get("/v1/plugins", async () => {
    const builtIns = [
      { id: "github", name: "GitHub", version: "1.0.0", enabled: true, capabilities: ["repository.read", "repository.write"] },
      { id: "jira", name: "Jira", version: "1.0.0", enabled: true, capabilities: ["issue.read", "issue.write"] },
    ];
    const states = options.database ? await options.database.listPlugins() : [];
    const stateById = new Map(states.map((state) => [String(state.plugin_id), state]));
    return builtIns.map((plugin) => ({
      ...plugin,
      enabled: Boolean(stateById.get(plugin.id)?.enabled ?? plugin.enabled),
      config: stateById.get(plugin.id)?.config ?? {},
    }));
  });

  app.put<{ Params: { id: string }; Body: { enabled?: boolean; config?: unknown } }>(
    "/v1/plugins/:id",
    async (request) => {
      if (!options.database) throw new Error("Database is not available.");
      await options.database.setPlugin(request.params.id, "default", request.body.enabled ?? true, request.body.config ?? {});
      return { id: request.params.id, enabled: request.body.enabled ?? true, config: request.body.config ?? {} };
    },
  );

  // Profile endpoints
  app.get("/v1/profile", async () => {
    const profile = await options.database?.getProfile("default", "default");
    return profile ?? { profile_id: "default", display_name: "Developer", initials: "D" };
  });

  app.put<{ Body: { displayName?: string } }>("/v1/profile", async (request, reply) => {
    const displayName = request.body.displayName?.trim() ?? "";
    if (displayName.length < 1 || displayName.length > 60) {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Display name must contain 1 to 60 characters." } });
    }
    const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "D";
    await options.database?.setProfile({ displayName, initials });
    return { profile_id: "default", display_name: displayName, initials };
  });

  app.post<{ Body: { task: string; provider?: string; projectId?: string; projectRoot?: string; metadata?: Record<string, unknown> } }>(
    "/v1/jobs",
    {
      schema: {
        body: {
          type: "object",
          required: ["task"],
          properties: {
            task: { type: "string", minLength: 1 },
            provider: { type: "string" },
            projectId: { type: "string" },
            projectRoot: { type: "string" },
            metadata: { type: "object" },
          },
        },
      },
    },
    async (request, reply) => {
      if ("allowedTools" in request.body) {
        return reply.code(400).send({
          error: {
            code: "UNSUPPORTED_FIELD",
            message: "Tool permissions are controlled by the server.",
          },
        });
      }
      const provider = request.body.provider ?? "chatgpt";
      const projectId = request.body.projectId ?? "default";
      const states = await options.database?.listProviders();
      const providerState = states?.find((state) => state.provider_id === provider);
      if (!providerState?.authenticated) {
        return reply.code(409).send({
          error: {
            code: "PROVIDER_NOT_CONNECTED",
            message: `Provider "${provider}" must be connected before a job can run.`,
          },
        });
      }
      const { task, metadata } = request.body;
      const job = await options.jobService.createJob({
        task,
        provider,
        projectId,
        metadata,
        projectRoot,
      });
      reply.code(201);
      return job;
    },
  );

  app.post<{ Params: { id: string } }>("/v1/jobs/:id/cancel", async (request, reply) => {
    const job = await options.jobService.cancelJob(request.params.id);
    if (!job) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Job not found" } });
    return job;
  });

  // Artifact preview endpoints
  app.post<{ Body: { artifactId: string; localPath: string; mimeType: string; width?: number; height?: number; size: number; sha256?: string } }>("/v1/artifacts/preview", async (request, reply) => {
    const secret = process.env.WTAGENT_ARTIFACT_SECRET;
    if (!secret) {
      return reply.code(503).send({ error: { code: "CONFIG_ERROR", message: "Artifact preview secret is not configured." } });
    }
    const { createArtifactPreview } = await import("@wtagent/artifacts");
    const preview = createArtifactPreview({
      secret,
      ttlMs: Number(process.env.WTAGENT_ARTIFACT_TTL_MS) || 3600 * 1000,
      maxThumbnailSize: Number(process.env.WTAGENT_ARTIFACT_THUMBNAIL_SIZE) || 256,
      thumbnailsDir: path.join(getAppDataDir(), "thumbnails"),
    });
    const record = {
      id: request.body.artifactId,
      type: request.body.mimeType.startsWith("image/") ? "image" : "other",
      localPath: request.body.localPath,
      mimeType: request.body.mimeType,
      width: request.body.width,
      height: request.body.height,
      size: request.body.size,
      sha256: request.body.sha256 ?? "",
      provenance: {},
    } as any;
    const signed = await preview.createSignedUrl(record);
    const thumbnail = await preview.generateThumbnail(record);
    return {
      ...signed,
      thumbnail: thumbnail ? {
        id: thumbnail.id,
        width: thumbnail.width,
        height: thumbnail.height,
      } : null,
    };
  });

  app.get<{ Params: { token: string } }>("/v1/artifacts/preview/:token", async (request, reply) => {
    const secret = process.env.WTAGENT_ARTIFACT_SECRET;
    if (!secret) {
      return reply.code(503).send({ error: { code: "CONFIG_ERROR", message: "Artifact preview secret is not configured." } });
    }
    const { createArtifactPreview } = await import("@wtagent/artifacts");
    const preview = createArtifactPreview({ secret });
    const token = request.params.token;
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
      const record = await preview.verifyToken(decoded.token, decoded.sig, decoded.exp);
      if (!record) {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Invalid or expired preview token." } });
      }
      return { artifactId: record.id, localPath: record.localPath, mimeType: record.mimeType, width: record.width, height: record.height, size: record.size };
    } catch {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Invalid preview token format." } });
    }
  });

  app.post<{ Params: { id: string } }>("/v1/jobs/:id/retry", async (request, reply) => {
    const job = await options.jobService.retryJob(request.params.id);
    if (!job) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Job not found" } });
    return job;
  });

  app.get<{ Params: { id: string } }>("/v1/jobs/:id", async (request, reply) => {
    const job = await options.jobService.getJob(request.params.id);
    if (!job) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Job not found" } });
    return job;
  });

  app.get<{ Params: { id: string } }>("/v1/jobs/:id/status", async (request, reply) => {
    const status = await options.jobService.getJobStatus(request.params.id);
    if (!status) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Job not found" } });
    return status;
  });

  app.get<{ Params: { id: string } }>("/v1/jobs/:id/events", async (request, reply) => {
    const job = await options.jobService.getJob(request.params.id);
    if (!job) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Job not found" } });

    reply.raw.setHeader("content-type", "text/event-stream");
    reply.raw.setHeader("cache-control", "no-cache, no-transform");
    reply.raw.setHeader("connection", "keep-alive");
    reply.raw.setHeader("access-control-allow-origin", "*");
    reply.raw.flushHeaders();

    let lastSerialized = "";
    let timer: NodeJS.Timeout;
    const publish = async () => {
      const status = await options.jobService.getJobStatus(request.params.id);
      if (!status) return;
      const serialized = JSON.stringify(status);
      if (serialized !== lastSerialized) {
        lastSerialized = serialized;
        reply.raw.write(`event: status\ndata: ${serialized}\n\n`);
      }
      if (["completed", "failed", "cancelled"].includes(status.status)) {
        clearInterval(timer);
        reply.raw.end();
      }
    };
    const cleanup = () => clearInterval(timer);
    reply.raw.on("close", cleanup);
    timer = setInterval(() => { void publish().catch(cleanup); }, 750);
    await publish();
    return reply;
  });

  app.get<{ Params: { id: string } }>("/v1/jobs/:id/logs", async (request, reply) => {
    const logs = await options.jobService.getJobLogs(request.params.id);
    if (!logs) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Job not found" } });
    return logs;
  });

  app.delete<{ Params: { id: string } }>("/v1/jobs/:id", async (request, reply) => {
    const job = await options.jobService.cancelJob(request.params.id);
    if (!job) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Job not found" } });
    return job;
  });

  app.get("/v1/models", async () => ({
    object: "list",
    data: Object.values(PROVIDERS)
      .filter((provider) => provider.status === "active")
      .map((provider) => ({
        id: provider.id,
        object: "model",
        owned_by: provider.id,
        capabilities: { chat_completions: true, streaming: false, tools: false, images: false },
      })),
  }));

  app.post<{
    Body: {
      model: string;
      messages: { role: "system" | "developer" | "user" | "assistant"; content: string }[];
      stream?: boolean;
    };
  }>("/v1/chat/completions", {
    schema: {
      body: {
        type: "object",
        required: ["model", "messages"],
        additionalProperties: false,
        properties: {
          model: { type: "string", minLength: 1, maxLength: 100 },
          messages: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["role", "content"],
              additionalProperties: false,
              properties: {
                role: { type: "string", enum: ["system", "developer", "user", "assistant"] },
                content: { type: "string", maxLength: 200_000 },
              },
            },
          },
          stream: { type: "boolean" },
        },
      },
    },
  }, async (request, reply) => {
    const { model, messages, stream = false } = request.body;
    if (stream) {
      return reply.code(501).send({
        error: { code: "UNSUPPORTED_CAPABILITY", message: "Streaming chat completions are not supported." },
      });
    }
    if (!messages.some((message) => message.role === "user")) {
      return reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: "At least one user message is required." },
      });
    }
    const provider = findProvider(model);
    if (!provider || provider.status !== "active") {
      return reply.code(404).send({
        error: { code: "MODEL_NOT_FOUND", message: `Model "${model}" is not available.` },
      });
    }
    const providerStates = await options.database?.listProviders() ?? [];
    if (!providerStates.some((state) => state.provider_id === provider.id && state.authenticated)) {
      return reply.code(409).send({
        error: { code: "PROVIDER_NOT_CONNECTED", message: `Provider "${provider.id}" is not connected.` },
      });
    }

    const completion = await executeGatewayChatCompletion({
      jobService: options.jobService,
      model: provider.id,
      messages,
      projectRoot,
      timeoutMs: Number(process.env.WTAGENT_JOB_TIMEOUT_MS) || undefined,
    });
    if (completion.status === "timeout") {
      return reply.code(504).send({
        error: { code: "JOB_TIMEOUT", message: "The provider did not complete before the request timeout." },
      });
    }
    if (completion.status === "failed") {
      return reply.code(502).send({
        error: {
          code: completion.code,
          message: completion.message,
        },
      });
    }

    return {
      id: `chatcmpl-${randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: "assistant", content: completion.message },
        finish_reason: "stop",
      }],
    };
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error
      ? error.statusCode
      : undefined;
    const status = typeof statusCode === "number" ? statusCode : 500;
    const message = error instanceof Error ? error.message : "The request could not be completed.";
    if (status >= 500) request.log.error({ err: error }, "Request failed.");
    reply.code(status).send({
      error: {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message: status >= 500 ? "The request could not be completed." : message,
        status,
      },
    });
  });

  app.addHook("onClose", async () => {
    await Promise.all([...loginBrowsers.values()].map(async (browser) => {
      await browser.close();
    }));
    loginBrowsers.clear();
  });

  return app;
}