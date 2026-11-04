import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { WTagentDatabase } from "./index.js";

const BACKUP_FORMAT = "neuralforge-pglite-backup";
const BACKUP_VERSION = 1;
const DATABASE_ARCHIVE = "database.pglite.tar.gz";

interface BackupFile {
  path: string;
  size: number;
  sha256: string;
}

interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  files: BackupFile[];
}

export interface CreateBackupOptions {
  database: WTagentDatabase;
  sessionsDir: string;
  destinationDir: string;
}

export interface CreateBackupResult {
  path: string;
  createdAt: string;
  fileCount: number;
  totalBytes: number;
}

export interface RestoreBackupOptions {
  backupDir: string;
  dataDir: string;
  sessionsDir: string;
}

export interface RestoreBackupResult {
  backupCreatedAt: string;
  restoredFiles: number;
  previousDataDir: string | null;
  previousSessionsDir: string | null;
}

function checksum(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

async function collectFiles(root: string, directory = root): Promise<BackupFile[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const files: BackupFile[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Backup does not support symbolic links: ${absolutePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...await collectFiles(root, absolutePath));
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Backup does not support special files: ${absolutePath}`);
    }
    const data = await readFile(absolutePath);
    files.push({
      path: path.relative(root, absolutePath).split(path.sep).join("/"),
      size: data.byteLength,
      sha256: checksum(data),
    });
  }
  return files;
}

async function copyDirectory(source: string, destination: string): Promise<void> {
  await mkdir(destination, { recursive: true, mode: 0o700 });
  let entries;
  try {
    entries = await readdir(source, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Backup does not support symbolic links: ${sourcePath}`);
    }
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      await mkdir(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
      await copyFile(sourcePath, destinationPath);
    } else {
      throw new Error(`Backup does not support special files: ${sourcePath}`);
    }
  }
}

function resolveManifestPath(backupDir: string, relativePath: string): string {
  if (
    !relativePath
    || relativePath.includes("\\")
    || path.posix.isAbsolute(relativePath)
    || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`Invalid path in backup manifest: ${relativePath}`);
  }
  const resolved = path.resolve(backupDir, ...relativePath.split("/"));
  const relative = path.relative(backupDir, resolved);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Backup manifest path escapes its directory: ${relativePath}`);
  }
  return resolved;
}

async function readAndValidateManifest(backupDir: string): Promise<{
  manifest: BackupManifest;
  files: Map<string, Uint8Array>;
}> {
  const manifestPath = path.join(backupDir, "manifest.json");
  const parsed: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    typeof parsed !== "object"
    || parsed === null
    || !("format" in parsed)
    || parsed.format !== BACKUP_FORMAT
    || !("version" in parsed)
    || parsed.version !== BACKUP_VERSION
    || !("createdAt" in parsed)
    || typeof parsed.createdAt !== "string"
    || !Number.isFinite(Date.parse(parsed.createdAt))
    || !("files" in parsed)
    || !Array.isArray(parsed.files)
  ) {
    throw new Error("Unsupported or invalid NeuralForge backup manifest.");
  }
  const manifest = parsed as BackupManifest;
  const files = new Map<string, Uint8Array>();
  for (const file of manifest.files) {
    if (
      typeof file !== "object"
      || file === null
      || typeof file.path !== "string"
      || !Number.isSafeInteger(file.size)
      || file.size < 0
      || typeof file.sha256 !== "string"
      || !/^[a-f0-9]{64}$/.test(file.sha256)
      || files.has(file.path)
    ) {
      throw new Error("Invalid file entry in NeuralForge backup manifest.");
    }
    if (file.path !== DATABASE_ARCHIVE && !file.path.startsWith("sessions/")) {
      throw new Error(`Unexpected file in NeuralForge backup manifest: ${file.path}`);
    }
    const filePath = resolveManifestPath(backupDir, file.path);
    const details = await lstat(filePath);
    if (!details.isFile() || details.isSymbolicLink()) {
      throw new Error(`Backup entry is not a regular file: ${file.path}`);
    }
    const data = new Uint8Array(await readFile(filePath));
    if (data.byteLength !== file.size || checksum(data) !== file.sha256) {
      throw new Error(`Backup integrity check failed for ${file.path}.`);
    }
    files.set(file.path, data);
  }
  if (!files.has(DATABASE_ARCHIVE)) {
    throw new Error("NeuralForge backup is missing its PGlite database archive.");
  }
  return { manifest, files };
}

export async function createWTagentBackup(
  options: CreateBackupOptions,
): Promise<CreateBackupResult> {
  const destinationDir = path.resolve(options.destinationDir);
  const parentDir = path.dirname(destinationDir);
  const stagingDir = path.join(parentDir, `.neuralforge-backup-${randomUUID()}.tmp`);
  const createdAt = new Date().toISOString();
  await mkdir(parentDir, { recursive: true, mode: 0o700 });

  try {
    await mkdir(path.join(stagingDir, "sessions"), { recursive: true, mode: 0o700 });
    const archive = new Uint8Array(await (await options.database.client.dumpDataDir("gzip")).arrayBuffer());
    const databasePath = path.join(stagingDir, DATABASE_ARCHIVE);
    await writeFile(databasePath, archive, { mode: 0o600, flag: "wx" });
    await copyDirectory(options.sessionsDir, path.join(stagingDir, "sessions"));

    const files = await collectFiles(stagingDir);
    const manifest: BackupManifest = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt,
      files,
    };
    await writeFile(
      path.join(stagingDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { mode: 0o600, flag: "wx" },
    );
    await rename(stagingDir, destinationDir);
    return {
      path: destinationDir,
      createdAt,
      fileCount: files.length,
      totalBytes: files.reduce((total, file) => total + file.size, 0),
    };
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    throw error;
  }
}

export async function restoreWTagentBackup(
  options: RestoreBackupOptions,
): Promise<RestoreBackupResult> {
  const backupDir = path.resolve(options.backupDir);
  const dataDir = path.resolve(options.dataDir);
  const sessionsDir = path.resolve(options.sessionsDir);
  const { manifest, files } = await readAndValidateManifest(backupDir);
  const archive = files.get(DATABASE_ARCHIVE)!;
  if (archive[0] !== 0x1f || archive[1] !== 0x8b) {
    throw new Error("PGlite database archive is not a gzip file.");
  }

  const restoreId = `${Date.now()}-${randomUUID()}`;
  const stagedDataDir = `${dataDir}.restore-${restoreId}`;
  const stagedSessionsDir = `${sessionsDir}.restore-${restoreId}`;
  const previousDataDir = `${dataDir}.pre-restore-${restoreId}`;
  const previousSessionsDir = `${sessionsDir}.pre-restore-${restoreId}`;
  let dataMoved = false;
  let sessionsMoved = false;
  let newDataInstalled = false;
  let newSessionsInstalled = false;

  try {
    await mkdir(path.dirname(dataDir), { recursive: true, mode: 0o700 });
    await mkdir(path.dirname(sessionsDir), { recursive: true, mode: 0o700 });
    await mkdir(stagedDataDir, { recursive: true, mode: 0o700 });
    await mkdir(stagedSessionsDir, { recursive: true, mode: 0o700 });
    for (const [filePath, data] of files) {
      if (filePath.startsWith("sessions/")) {
        const relative = filePath.slice("sessions/".length);
        const destination = resolveManifestPath(stagedSessionsDir, relative);
        await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
        await writeFile(destination, data, { mode: 0o600, flag: "wx" });
      }
    }

    const stagedDatabasePath = path.join(stagedDataDir, "neuralforge.pglite");
    const archiveBuffer = new Uint8Array(archive);
    const validationDatabase = new PGlite(stagedDatabasePath, {
      loadDataDir: new Blob([archiveBuffer]),
    });
    await validationDatabase.waitReady;
    try {
      const validation = await validationDatabase.query<{ migrations: string | null }>(
        "SELECT to_regclass('public.schema_migrations') AS migrations",
      );
      if (!validation.rows[0]?.migrations) {
        throw new Error("The backup does not contain a NeuralForge PGlite schema.");
      }
    } finally {
      await validationDatabase.close();
    }

    try {
      await rename(dataDir, previousDataDir);
      dataMoved = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    try {
      await rename(sessionsDir, previousSessionsDir);
      sessionsMoved = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await rename(stagedDataDir, dataDir);
    newDataInstalled = true;
    await rename(stagedSessionsDir, sessionsDir);
    newSessionsInstalled = true;
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const rollback of [
      () => newSessionsInstalled ? rm(sessionsDir, { recursive: true, force: true }) : Promise.resolve(),
      () => newDataInstalled ? rm(dataDir, { recursive: true, force: true }) : Promise.resolve(),
      () => sessionsMoved ? rename(previousSessionsDir, sessionsDir) : Promise.resolve(),
      () => dataMoved ? rename(previousDataDir, dataDir) : Promise.resolve(),
    ]) {
      try {
        await rollback();
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        "NeuralForge backup restore failed and rollback was incomplete.",
      );
    }
    throw error;
  } finally {
    await rm(stagedDataDir, { recursive: true, force: true });
    await rm(stagedSessionsDir, { recursive: true, force: true });
  }

  return {
    backupCreatedAt: manifest.createdAt,
    restoredFiles: files.size,
    previousDataDir: dataMoved ? previousDataDir : null,
    previousSessionsDir: sessionsMoved ? previousSessionsDir : null,
  };
}
