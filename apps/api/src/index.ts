import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import type { FastifyInstance } from "fastify";
import { WTagentDatabase } from "@wtagent/database";
import { createJobService, JobStore, type JobService } from "@wtagent/job";
import { PGliteJobStore } from "./pglite-job-store.js";

let server: FastifyInstance | null = null;
let database: WTagentDatabase | null = null;
let jobService: JobService | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;
let cleanupPromise: Promise<void> | null = null;

const DEFAULT_JOB_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export async function startApi(): Promise<FastifyInstance> {
  if (server) {
    return server;
  }

  const bindHost = process.env.WTAGENT_HOST?.trim() || "127.0.0.1";
  const jwtSecret = process.env.WTAGENT_JWT_SECRET;
  const isLoopback = ["127.0.0.1", "::1", "localhost"].includes(bindHost);
  if (!isLoopback && (!jwtSecret || jwtSecret.length < 32)) {
    throw new Error("Remote API binding requires WTAGENT_JWT_SECRET to contain at least 32 characters.");
  }

  const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
  const configuredProjectRoot = process.env.WTAGENT_PROJECT_ROOT;
  const projectRoot = configuredProjectRoot && configuredProjectRoot !== "auto"
    ? path.resolve(configuredProjectRoot)
    : path.resolve(apiDirectory, "..", "..", "..");

  const configuredTtl = process.env.WTAGENT_JOB_TTL_MS;
  const jobTtlMs = configuredTtl === undefined ? DEFAULT_JOB_TTL_MS : Number(configuredTtl);
  if (!Number.isSafeInteger(jobTtlMs) || jobTtlMs < 1 || jobTtlMs > 8_640_000_000_000_000) {
    throw new RangeError("WTAGENT_JOB_TTL_MS must be a positive safe integer within the supported date range.");
  }

  const dataDir = process.env.WTAGENT_DATA_DIR ?? path.join(projectRoot, ".wtagent");
  database = await WTagentDatabase.open({
    dataDir: path.join(dataDir, "data"),
  });
  const legacyStore = new JobStore(path.join(dataDir, "jobs"));
  await legacyStore.initialize();
  const persistentJobStore = new PGliteJobStore(database);
  await persistentJobStore.importLegacyJobs(await legacyStore.list());
  jobService = createJobService(dataDir, {
    provider: process.env.WTAGENT_PROVIDER ?? "chatgpt",
    defaultAllowedTools: ["fs.list", "fs.read", "fs.search"],
    executionTimeoutMs: process.env.WTAGENT_JOB_TIMEOUT_MS === undefined
      ? undefined
      : Number(process.env.WTAGENT_JOB_TIMEOUT_MS),
    store: persistentJobStore,
  });
  await jobService.initialize();
  await jobService.start();
  server = await buildApp({
    jobService,
    database,
    dataDir,
    projectRoot,
    jwtSecret,
    corsOptions: {
      origins: process.env.WTAGENT_CORS_ORIGINS
        ? process.env.WTAGENT_CORS_ORIGINS.split(",")
        : ["http://localhost:3000", "http://localhost:5173"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
      credentials: false,
      maxAge: 86400,
      allowAll: false,
    },
    rateLimitOptions: {
      global: {
        maxRequests: 100,
        windowMs: 60000, // 100 requests per minute
      },
      auth: {
        maxRequests: 10,
        windowMs: 60000, // 10 requests per minute for auth
      },
    },
  });
  await server.listen({ host: bindHost, port: Number(process.env.PORT ?? "8080") });

  cleanupTimer = setInterval(
    () => scheduleExpiredJobCleanup(jobService!, jobTtlMs),
    CLEANUP_INTERVAL_MS,
  );
  cleanupTimer.unref?.();

  return server;
}

function scheduleExpiredJobCleanup(service: JobService, ttlMs: number): void {
  if (cleanupPromise) return;
  cleanupPromise = cleanupExpiredJobs(service, ttlMs)
    .catch((error) => {
      console.error("Job TTL cleanup error:", error);
    })
    .finally(() => {
      cleanupPromise = null;
    });
}

async function cleanupExpiredJobs(service: JobService, ttlMs: number): Promise<void> {
  const cutoff = new Date(Date.now() - ttlMs).toISOString();
  const expired = await service.deleteExpiredJobs(cutoff);

  if (expired.length > 0) console.info(`Removed ${expired.length} expired terminal job(s).`);
}

export async function stopApi(): Promise<void> {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  if (cleanupPromise) {
    await cleanupPromise;
    cleanupPromise = null;
  }
  if (server) {
    await server.close();
    server = null;
  }
  if (jobService) {
    await jobService.stop();
    jobService = null;
  }
  if (database) {
    await database.close();
    database = null;
  }
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  await startApi();
}