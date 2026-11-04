// Database backup / restore scripts for WTAgent

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';

export interface BackupOptions {
  /** Output directory for backup files */
  outputDir: string;
  /** Compress with gzip */
  gzip?: boolean;
  /** Include job data */
  includeJobs?: boolean;
  /** Include artifact data */
  includeArtifacts?: boolean;
  /** Include session data */
  includeSessions?: boolean;
  /** Maximum age of jobs to include (days) */
  maxJobAgeDays?: number;
  /** Exclude jobs with this status */
  excludeJobStatuses?: JobStatus[];
}

/** Job status types */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Create a backup of the WTAgent data directory
 * @param options Backup configuration options
 * @returns Backup file path(s)
 */
export async function createBackup(options: BackupOptions): Promise<string | { main: string; metadata: string }> {
  const {
    outputDir,
    gzip = true,
    includeJobs = true,
    includeArtifacts = true,
    includeSessions = true,
    maxJobAgeDays,
    excludeJobStatuses,
  } = options;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(outputDir, `wtagent-backup-${timestamp}`);
  await fs.mkdir(backupDir, { recursive: true });

  const metadata: Record<string, unknown> = {
    createdAt: new Date().toISOString(),
    options,
    componentBackups: [] as string[],
  };

  // 1. Backup PGlite database
  let dbPath: string;
  try {
    // Try to find the PGlite data directory
    const dataDir = process.env.WTAGENT_DATA_DIR ?? path.join(process.cwd(), '.wtagent', 'data');
    const dbFiles = await fs.readdir(dataDir);
    const pgliteFile = dbFiles.find((f) => f.endsWith('.pglite'));
    dbPath = pgliteFile ? path.join(dataDir, pgliteFile) : null;
  } catch {
    dbPath = null;
  }

  if (dbPath) {
    const dbBackupPath = path.join(backupDir, 'database.pglite');
    await fs.cp(dbPath, dbBackupPath, { recursive: true });
    metadata.componentBackups.push('database');
    metadata['database-path'] = dbPath;
  }

  // 2. Backup job data (if requested)
  if (includeJobs) {
    const jobsDir = path.join(backupDir, 'jobs');
    await fs.mkdir(jobsDir, { recursive: true });

    // Find job stores
    const possibleJobsDirs = [
      path.join(process.cwd(), '.wtagent', 'jobs'),
      path.join(process.cwd(), 'data', 'jobs'),
    ];

    for (const dir of possibleJobsDirs) {
      try {
        const entries = await fs.readdir(dir, { recursive: true });
        for (const file of entries) {
          if (file.endsWith('.json') || file.endsWith('.jsonl')) {
            const srcPath = path.join(dir, file);
            const relativePath = path.relative(possibleJobsDirs[0], srcPath);
            const destPath = path.join(jobsDir, relativePath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.cp(srcPath, destPath, { overwrite: true });
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    metadata.componentBackups.push('jobs');
  }

  // 3. Backup artifact data (if requested)
  if (includeArtifacts) {
    const artifactsDir = path.join(backupDir, 'artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });

    const possibleArtifactsDirs = [
      path.join(process.cwd(), '.wtagent', 'artifacts'),
      path.join(process.cwd(), 'data', 'artifacts'),
    ];

    for (const dir of possibleArtifactsDirs) {
      try {
        const entries = await fs.readdir(dir, { recursive: true });
        for (const file of entries) {
          if (!file.startsWith('.') && (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp'))) {
            const srcPath = path.join(dir, file);
            const relativePath = path.relative(possibleArtifactsDirs[0], srcPath);
            const destPath = path.join(artifactsDir, relativePath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.cp(srcPath, destPath, { overwrite: true });
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    metadata.componentBackups.push('artifacts');
  }

  // 4. Backup session data (if requested)
  if (includeSessions) {
    const sessionsDir = path.join(backupDir, 'sessions');
    await fs.mkdir(sessionsDir, { recursive: true });

    const possibleSessionsDirs = [
      path.join(process.cwd(), '.wtagent', 'sessions'),
      path.join(process.cwd(), 'data', 'sessions'),
    ];

    for (const dir of possibleSessionsDirs) {
      try {
        const entries = await fs.readdir(dir, { recursive: true });
        for (const file of entries) {
          if (file.endsWith('.json') || file.endsWith('.jsonl')) {
            const srcPath = path.join(dir, file);
            const relativePath = path.relative(possibleSessionsDirs[0], srcPath);
            const destPath = path.join(sessionsDir, relativePath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.cp(srcPath, destPath, { overwrite: true });
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    metadata.componentBackups.push('sessions');
  }

  // 5. Create metadata file
  const metadataPath = path.join(backupDir, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  // 6. Compress if requested
  if (gzip) {
    const gzPath = backupDir + '.tar.gz';
    try {
      execSync(`cd ${path.dirname(backupDir)} && tar -czf ${path.basename(gzPath)} ${path.basename(backupDir)}`, {
        cwd: path.dirname(backupDir),
      });
      await fs.rm(backupDir, { recursive: true, force: true });
      return gzPath;
    } catch (err) {
      console.error('Compression failed, returning uncompressed backup:', err);
    }
  }

  return backupDir;
}

/**
 * Restore WTAgent data from a backup file
 * @param backupPath Path to backup file or directory
 * @param options Restore options
 */
export async function restoreBackup(backupPath: string, options: { targetDir?: string } = {}): Promise<void> {
  const targetDir = options.targetDir ?? process.cwd();
  const backupExists = await pathExists(backupPath);

  if (!backupExists) {
    throw new Error(`Backup not found: ${backupPath}`);
  }

  const backupIsDir = (await fs.stat(backupPath)).isDirectory();

  if (backupIsDir) {
    // Backup is an uncompressed directory
    await restoreFromDirectory(backupPath, targetDir);
  } else {
    // Backup is a .tar.gz file
    await restoreFromTarGz(backupPath, targetDir);
  }
}

/**
 * Restore from a directory backup
 */
async function restoreFromDirectory(backupDir: string, targetDir: string): Promise<void> {
  // Copy each component to its appropriate location
  const components = await fs.readdir(backupDir);

  for (const component of components) {
    if (component === 'metadata.json') continue;

    const componentSrc = path.join(backupDir, component);
    const componentDest = path.join(targetDir, component);

    try {
      await fs.mkdir(path.dirname(componentDest), { recursive: true });
      await fs.cp(componentSrc, componentDest, { recursive: true });
      console.log(`Restored: ${component}`);
    } catch (err) {
      console.error(`Failed to restore ${component}:`, err);
    }
  }
}

/**
 * Restore from a .tar.gz backup
 */
async function restoreFromTarGz(backupPath: string, targetDir: string): Promise<void> {
  const extractDir = path.join(targetDir, '.wtagent-restore-' + Date.now());
  await fs.mkdir(extractDir, { recursive: true });

  try {
    execSync(`tar -xzf ${backupPath} -C ${extractDir}`, { stdio: 'pipe' });
    await restoreFromDirectory(extractDir, targetDir);
    await fs.rm(extractDir, { recursive: true, force: true });
  } catch (err) {
    await fs.rm(extractDir, { recursive: true, force: true });
    throw new Error(`Failed to restore from tar.gz: ${(err as Error).message}`);
  }
}

/**
 * Check if a path exists
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * List available backups
 * @param backupDir Directory to search for backups
 * @returns Sorted list of backup metadata
 */
export async function listBackups(backupDir: string): Promise<Record<string, unknown>[]> {
  const backups: Record<string, unknown>[] = [];

  try {
    const entries = await fs.readdir(backupDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('wtagent-backup-')) {
        try {
          const metadataPath = path.join(backupDir, entry.name, 'metadata.json');
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          backups.push({ ...metadata, path: path.join(backupDir, entry.name), name: entry.name });
        } catch {
          // No metadata, create minimal entry
          backups.push({ name: entry.name, path: path.join(backupDir, entry.name), createdAt: undefined });
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  // Sort by creation date descending
  return backups.sort((a, b) => {
    const aDate = (a as any).createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = (b as any).createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });
}

/**
 * Validate a backup metadata file
 * @param metadataPath Path to metadata.json
 * @returns Validation result
 */
export async function validateBackup(metadataPath: string): Promise<{ valid: boolean; errors: string[]; info: Record<string, unknown> }> {
  const errors: string[] = [];
  const info: Record<string, unknown> = {};

  try {
    const content = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(content);

    info.name = metadata.name ?? 'unknown';
    info.createdAt = metadata.createdAt ?? 'unknown';

    // Check required fields
    if (!metadata.options) {
      errors.push('Missing "options" field');
    }

    if (metadata.componentBackups && metadata.componentBackups.length === 0) {
      errors.push('No components backed up');
    }

    info.components = metadata.componentBackups ?? [];

    return { valid: errors.length === 0, errors, info };
  } catch (err) {
    return {
      valid: false,
      errors: [(err as Error).message || 'Failed to read metadata'],
      info: {},
    };
  }
}

export type { BackupOptions, JobStatus };