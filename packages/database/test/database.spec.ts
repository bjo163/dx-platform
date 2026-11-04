import { describe, it, expect } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createWTagentBackup, restoreWTagentBackup, WTagentDatabase } from '../src';

describe('WTagentDatabase', () => {
  it('should have class definition', () => {
    expect(typeof WTagentDatabase).toBe('function');
  });

  it('should have static open method', () => {
    expect(typeof WTagentDatabase.open).toBe('function');
  });

  it('should have migrate method', () => {
    expect(typeof WTagentDatabase.prototype.migrate).toBe('function');
  });

  it('should have close method', () => {
    expect(typeof WTagentDatabase.prototype.close).toBe('function');
  });

  it('should have listPlugins method', () => {
    expect(typeof WTagentDatabase.prototype.listPlugins).toBe('function');
  });

  it('should have setPlugin method', () => {
    expect(typeof WTagentDatabase.prototype.setPlugin).toBe('function');
  });

  it('should have listProviders method', () => {
    expect(typeof WTagentDatabase.prototype.listProviders).toBe('function');
  });

  it('should have setProvider method', () => {
    expect(typeof WTagentDatabase.prototype.setProvider).toBe('function');
  });

  it('should have getProfile method', () => {
    expect(typeof WTagentDatabase.prototype.getProfile).toBe('function');
  });

  it('should have setProfile method', () => {
    expect(typeof WTagentDatabase.prototype.setProfile).toBe('function');
  });

  it('should have DatabaseOptions interface', () => {
    const options: { dataDir: string } = { dataDir: '.wtagent-db' };
    expect(options).toHaveProperty('dataDir');
  });

  it('migrates existing single-project tables to project-scoped keys without losing data', async () => {
    const dataDir = await mkdtemp(path.join(os.tmpdir(), 'wtagent-db-migration-'));
    const raw = new PGlite(path.join(dataDir, 'wtagent.pglite'));
    await raw.waitReady;
    await raw.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE projects (
        project_id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE jobs (
        job_id TEXT PRIMARY KEY, task TEXT NOT NULL, status TEXT NOT NULL,
        provider TEXT NOT NULL, project_root TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE activity (
        id TEXT PRIMARY KEY, job_id TEXT, kind TEXT NOT NULL, message TEXT NOT NULL,
        created_at TEXT NOT NULL, sequence BIGSERIAL
      );
      CREATE TABLE plugin_states (
        plugin_id TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT true,
        config JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TEXT NOT NULL
      );
      CREATE TABLE provider_states (
        provider_id TEXT PRIMARY KEY, configured BOOLEAN NOT NULL DEFAULT false,
        authenticated BOOLEAN NOT NULL DEFAULT false, details JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE application_profiles (
        profile_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, initials TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO jobs(job_id, task, status, provider, project_root, payload, created_at, updated_at)
      VALUES ('legacy-job', 'Legacy task', 'completed', 'chatgpt', '.', '{}'::jsonb,
        '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      INSERT INTO plugin_states(plugin_id, enabled, config, updated_at)
      VALUES ('legacy-plugin', true, '{}'::jsonb, '2026-01-01T00:00:00.000Z');
      INSERT INTO provider_states(provider_id, configured, authenticated, details, updated_at)
      VALUES ('chatgpt', true, true, '{}'::jsonb, '2026-01-01T00:00:00.000Z');
      INSERT INTO application_profiles(profile_id, display_name, initials, updated_at)
      VALUES ('default', 'Legacy profile', 'LP', '2026-01-01T00:00:00.000Z');
    `);
    await raw.close();

    const database = await WTagentDatabase.open({ dataDir });
    try {
      await database.createProject('second', 'Second project');
      await database.setPlugin('legacy-plugin', 'second', true, {});
      await database.setProvider('chatgpt', 'second', { configured: true, authenticated: false });
      await database.setProfile({
        profileId: 'default',
        projectId: 'second',
        displayName: 'Second profile',
        initials: 'SP',
      });
      await database.migrateProjectScopedConstraints();

      const legacyJob = await database.client.query<{ project_id: string }>(
        "SELECT project_id FROM jobs WHERE job_id = 'legacy-job'",
      );
      expect(legacyJob.rows[0]?.project_id).toBe('default');
      expect(await database.listPluginsByProject('default')).toHaveLength(1);
      expect(await database.listPluginsByProject('second')).toHaveLength(1);
      expect(await database.listProvidersByProject('default')).toHaveLength(1);
      expect(await database.listProvidersByProject('second')).toHaveLength(1);
      expect(await database.getProfile('default', 'default')).toMatchObject({
        display_name: 'Legacy profile',
      });
      expect(await database.getProfile('default', 'second')).toMatchObject({
        display_name: 'Second profile',
      });
    } finally {
      await database.close();
      await rm(dataDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('backs up and restores the database and sessions while preserving the previous data', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'wtagent-backup-'));
    const sourceDataDir = path.join(root, 'source', 'data');
    const sourceSessionsDir = path.join(root, 'source', 'sessions');
    const destinationDataDir = path.join(root, 'target', 'data');
    const destinationSessionsDir = path.join(root, 'target', 'sessions');
    const transcript = path.join(sourceSessionsDir, 'job-1', 'transcript.json');
    let restoredDatabase: WTagentDatabase | undefined;

    try {
      const source = await WTagentDatabase.open({ dataDir: sourceDataDir });
      await source.createProject('backup-project', 'Backup project');
      await mkdir(path.dirname(transcript), { recursive: true });
      await writeFile(transcript, '{"events":["saved"]}');
      const backup = await createWTagentBackup({
        database: source,
        sessionsDir: sourceSessionsDir,
        destinationDir: path.join(root, 'backups', 'snapshot'),
      });
      await source.close();

      const existing = await WTagentDatabase.open({ dataDir: destinationDataDir });
      await existing.createProject('old-project', 'Old project');
      await existing.close();
      await mkdir(destinationSessionsDir, { recursive: true });
      await writeFile(path.join(destinationSessionsDir, 'old.json'), 'old session');

      const result = await restoreWTagentBackup({
        backupDir: backup.path,
        dataDir: destinationDataDir,
        sessionsDir: destinationSessionsDir,
      });

      expect(result.previousDataDir).not.toBeNull();
      expect(result.previousSessionsDir).not.toBeNull();
      expect(await readFile(path.join(destinationSessionsDir, 'job-1', 'transcript.json'), 'utf8'))
        .toBe('{"events":["saved"]}');
      await expect(readFile(path.join(destinationSessionsDir, 'old.json'))).rejects.toMatchObject({ code: 'ENOENT' });

      restoredDatabase = await WTagentDatabase.open({ dataDir: destinationDataDir });
      expect((await restoredDatabase.listProjects()).map((project) => project.project_id))
        .toContain('backup-project');
      const previousDatabase = await WTagentDatabase.open({ dataDir: result.previousDataDir! });
      try {
        expect((await previousDatabase.listProjects()).map((project) => project.project_id))
          .toContain('old-project');
      } finally {
        await previousDatabase.close();
      }
    } finally {
      await restoredDatabase?.close();
      await rm(root, { recursive: true, force: true });
    }
  }, 60_000);

  it('rejects a corrupt backup without changing the existing database', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'wtagent-backup-corrupt-'));
    const backupDataDir = path.join(root, 'source', 'data');
    const backupSessionsDir = path.join(root, 'source', 'sessions');
    const targetDataDir = path.join(root, 'target', 'data');
    const targetSessionsDir = path.join(root, 'target', 'sessions');
    let target: WTagentDatabase | undefined;

    try {
      const source = await WTagentDatabase.open({ dataDir: backupDataDir });
      const backup = await createWTagentBackup({
        database: source,
        sessionsDir: backupSessionsDir,
        destinationDir: path.join(root, 'backups', 'snapshot'),
      });
      await source.close();
      const archive = path.join(backup.path, 'database.pglite.tar.gz');
      await writeFile(archive, Buffer.from('tampered'));

      target = await WTagentDatabase.open({ dataDir: targetDataDir });
      await target.createProject('keep-project', 'Keep project');
      await target.close();
      target = undefined;

      await expect(restoreWTagentBackup({
        backupDir: backup.path,
        dataDir: targetDataDir,
        sessionsDir: targetSessionsDir,
      })).rejects.toThrow('integrity check failed');

      target = await WTagentDatabase.open({ dataDir: targetDataDir });
      expect((await target.listProjects()).map((project) => project.project_id)).toContain('keep-project');
    } finally {
      await target?.close();
      await rm(root, { recursive: true, force: true });
    }
  }, 60_000);
});