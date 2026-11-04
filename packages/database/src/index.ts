import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
export {
  createWTagentBackup,
  restoreWTagentBackup,
  type CreateBackupOptions,
  type CreateBackupResult,
  type RestoreBackupOptions,
  type RestoreBackupResult,
} from "./backup.js";

export interface DatabaseOptions {
  dataDir: string;
}

const migrations = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS projects (
    project_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task TEXT NOT NULL,
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    project_root TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    job_id TEXT REFERENCES jobs(job_id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    sequence BIGSERIAL
  );`,
  `CREATE TABLE IF NOT EXISTS plugin_states (
    plugin_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (plugin_id, project_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS provider_states (
    provider_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    configured BOOLEAN NOT NULL DEFAULT false,
    authenticated BOOLEAN NOT NULL DEFAULT false,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (provider_id, project_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS application_profiles (
    profile_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    initials TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (profile_id, project_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
  );`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS project_id TEXT NOT NULL DEFAULT 'default';`,
  `ALTER TABLE plugin_states ADD COLUMN IF NOT EXISTS project_id TEXT NOT NULL DEFAULT 'default';`,
  `ALTER TABLE provider_states ADD COLUMN IF NOT EXISTS project_id TEXT NOT NULL DEFAULT 'default';`,
  `ALTER TABLE application_profiles ADD COLUMN IF NOT EXISTS project_id TEXT NOT NULL DEFAULT 'default';`,
  `CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON jobs(status, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS jobs_project_idx ON jobs(project_id);`,
  `CREATE INDEX IF NOT EXISTS activity_created_idx ON activity(created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS activity_job_sequence_idx ON activity(job_id, sequence);`,
  `CREATE INDEX IF NOT EXISTS plugin_states_project_idx ON plugin_states(project_id);`,
  `CREATE INDEX IF NOT EXISTS provider_states_project_idx ON provider_states(project_id);`,
  `CREATE INDEX IF NOT EXISTS application_profiles_project_idx ON application_profiles(project_id);`,
  `ALTER TABLE activity ADD COLUMN IF NOT EXISTS sequence BIGSERIAL;`,
];

export class WTagentDatabase {
  readonly client: PGlite;

  private constructor(client: PGlite) {
    this.client = client;
  }

  static async open(options: DatabaseOptions): Promise<WTagentDatabase> {
    await mkdir(options.dataDir, { recursive: true, mode: 0o700 });
    const client = new PGlite(path.join(options.dataDir, "wtagent.pglite"));
    await client.waitReady;
    const database = new WTagentDatabase(client);
    await database.migrate();
    await database.ensureDefaultProject();
    await database.migrateProjectScopedConstraints();
    return database;
  }

  async migrate(): Promise<void> {
    for (let index = 0; index < migrations.length; index += 1) {
      await this.client.exec(migrations[index]!);
    }
    await this.client.query(
      "INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT(version) DO NOTHING;",
    );
  }

  async ensureDefaultProject(): Promise<void> {
    await this.client.query(
      "INSERT INTO projects(project_id, name, description, created_at, updated_at) " +
      "VALUES ('default', 'Default Project', 'Default project for backward compatibility', $1, $1) " +
      "ON CONFLICT(project_id) DO NOTHING;",
      [new Date().toISOString()]
    );
  }

  async migrateProjectScopedConstraints(): Promise<void> {
    const applied = await this.client.query(
      "SELECT version FROM schema_migrations WHERE version = 3",
    );
    if (applied.rows.length > 0) return;

    await this.client.transaction(async (tx) => {
      for (const [table, key] of [
        ["plugin_states", "plugin_id"],
        ["provider_states", "provider_id"],
        ["application_profiles", "profile_id"],
      ] as const) {
        await tx.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_pkey`);
        await tx.query(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_pkey PRIMARY KEY (${key}, project_id)`);
      }

      for (const table of ["jobs", "plugin_states", "provider_states", "application_profiles"]) {
        await tx.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_project_id_fkey`);
        await tx.query(
          `ALTER TABLE ${table} ADD CONSTRAINT ${table}_project_id_fkey
           FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE`,
        );
      }

      await tx.query("INSERT INTO schema_migrations(version) VALUES (3)");
    });
  }

  async createProject(projectId: string, name: string, description: string = ""): Promise<void> {
    const now = new Date().toISOString();
    await this.client.query(
      `INSERT INTO projects(project_id, name, description, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$4)
       ON CONFLICT(project_id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, updated_at=EXCLUDED.updated_at`,
      [projectId, name, description, now]
    );
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.client.query("DELETE FROM projects WHERE project_id = $1", [projectId]);
  }

  async listProjects(): Promise<Record<string, unknown>[]> {
    const result = await this.client.query("SELECT * FROM projects ORDER BY created_at DESC");
    return result.rows as Record<string, unknown>[];
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async listPlugins(): Promise<Record<string, unknown>[]> {
    const result = await this.client.query("SELECT * FROM plugin_states ORDER BY plugin_id");
    return result.rows as Record<string, unknown>[];
  }

  async listPluginsByProject(projectId: string): Promise<Record<string, unknown>[]> {
    const result = await this.client.query("SELECT * FROM plugin_states WHERE project_id = $1 ORDER BY plugin_id", [projectId]);
    return result.rows as Record<string, unknown>[];
  }

  async setPlugin(pluginId: string, projectId: string, enabled: boolean, config: unknown): Promise<void> {
    await this.client.query(
      `INSERT INTO plugin_states(plugin_id, project_id, enabled, config, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT(plugin_id, project_id) DO UPDATE SET enabled=EXCLUDED.enabled, config=EXCLUDED.config,
       updated_at=EXCLUDED.updated_at`,
      [pluginId, projectId, enabled, JSON.stringify(config), new Date().toISOString()]
    );
  }

  async listProviders(): Promise<Record<string, unknown>[]> {
    const result = await this.client.query("SELECT * FROM provider_states ORDER BY provider_id");
    return result.rows as Record<string, unknown>[];
  }

  async listProvidersByProject(projectId: string): Promise<Record<string, unknown>[]> {
    const result = await this.client.query("SELECT * FROM provider_states WHERE project_id = $1 ORDER BY provider_id", [projectId]);
    return result.rows as Record<string, unknown>[];
  }

  async setProvider(providerId: string, projectId: string, state: {
    configured: boolean;
    authenticated: boolean;
    details?: unknown;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO provider_states(provider_id, project_id, configured, authenticated, details, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT(provider_id, project_id) DO UPDATE SET configured=EXCLUDED.configured,
       authenticated=EXCLUDED.authenticated, details=EXCLUDED.details, updated_at=EXCLUDED.updated_at`,
      [providerId, projectId, state.configured, state.authenticated, JSON.stringify(state.details ?? {}), new Date().toISOString()]
    );
  }

  async getProfile(profileId = "default", projectId = "default"): Promise<Record<string, unknown> | null> {
    const result = await this.client.query(
      "SELECT profile_id, display_name, initials, updated_at FROM application_profiles WHERE profile_id = $1 AND project_id = $2",
      [profileId, projectId]
    );
    return result.rows[0] as Record<string, unknown> ?? null;
  }

  async setProfile(profile: { profileId?: string; projectId?: string; displayName: string; initials: string }): Promise<void> {
    const projectId = profile.projectId ?? "default";
    const profileId = profile.profileId ?? "default";
    await this.client.query(
      `INSERT INTO application_profiles(profile_id, project_id, display_name, initials, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT(profile_id, project_id) DO UPDATE SET display_name=EXCLUDED.display_name,
       initials=EXCLUDED.initials, updated_at=EXCLUDED.updated_at`,
      [profileId, projectId, profile.displayName.trim(), profile.initials.trim(), new Date().toISOString()]
    );
  }
}
