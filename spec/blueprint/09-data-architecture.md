# WTAgent Master Blueprint — Data Architecture

## Document: 09-data-architecture.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Data Architecture Overview

WTAgent uses PGlite (embedded PostgreSQL-compatible database) for structured data and JSONL files for audit logs. This document defines entities, relationships, data lifecycle, and integrity constraints.

---

## Database Schema

### Jobs Table

```sql
CREATE TABLE jobs (
  job_id TEXT PRIMARY KEY,
  task TEXT NOT NULL CHECK (length(task) >= 1 AND length(task) <= 10000),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  provider TEXT NOT NULL,
  project_root TEXT NOT NULL,
  allowed_tools TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  result JSONB,
  error JSONB
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_provider ON jobs(provider);
```

### Providers Table

```sql
CREATE TABLE providers (
  provider_id TEXT PRIMARY KEY,
  configured BOOLEAN NOT NULL DEFAULT false,
  authenticated BOOLEAN NOT NULL DEFAULT false,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMP
);
```

### Plugins Table

```sql
CREATE TABLE plugins (
  plugin_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Profiles Table

```sql
CREATE TABLE profiles (
  profile_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL CHECK (length(display_name) >= 1 AND length(display_name) <= 60),
  initials TEXT NOT NULL CHECK (length(initials) >= 1 AND length(initials) <= 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Schema Migrations Table

```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
  checksum TEXT NOT NULL
);
```

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    Entity Relationship Diagram                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │    jobs      │                                               │
│  │  ──────────  │                                               │
│  │  job_id (PK) │                                               │
│  │  task        │                                               │
│  │  status      │                                               │
│  │  provider    │───┐                                           │
│  │  payload     │   │ references                                │
│  └──────────────┘   │   provider_id                             │
│                     ▼                                           │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   providers  │  │   plugins    │                            │
│  │  ──────────  │  │  ──────────  │                            │
│  │provider_id(PK)│  │ plugin_id(PK)│                            │
│  │ configured   │  │ enabled      │                            │
│  │ authenticated│  │ config       │                            │
│  │ details      │  └──────────────┘                            │
│  └──────────────┘                                               │
│                                                                  │
│  ┌──────────────┐                                               │
│  │   profiles   │                                               │
│  │  ──────────  │                                               │
│  │profile_id(PK)│                                               │
│  │display_name  │                                               │
│  │initials      │                                               │
│  └──────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Lifecycle

### Job Lifecycle

| Phase | Data State | Operations | Retention |
|-------|------------|------------|-----------|
| Creation | `status=pending` | INSERT job | Until deletion |
| Execution | `status=running` | UPDATE status, payload | Until deletion |
| Completion | `status=completed/failed/cancelled` | UPDATE status, result/error, completed_at | 90 days (configurable) |
| Archival | Moved to archive table | DELETE from main, INSERT to archive | 1 year |
| Purge | Deleted | DELETE from archive | Permanent |

### Provider State Lifecycle

| Phase | Data State | Operations | Retention |
|-------|------------|------------|-----------|
| Initial | `configured=false, authenticated=false` | INSERT provider | Until disconnect |
| Login | `configured=true, authenticated=false` | UPDATE configured, details | Until disconnect |
| Verified | `configured=true, authenticated=true` | UPDATE authenticated, last_verified_at | Until disconnect |
| Disconnected | `configured=false, authenticated=false` | UPDATE both, DELETE profile dir | Until re-login |

### Audit Log Lifecycle

| Phase | Storage | Operations | Retention |
|-------|---------|------------|-----------|
| Active | `.wtagent/data/audit/current.jsonl` | APPEND | 7 days |
| Rotated | `.wtagent/data/audit/YYYY-MM-DD.jsonl.gz` | COMPRESS, RENAME | 30 days |
| Purged | DELETED | rm old files | Permanent |

---

## Data Integrity Constraints

### Validation Rules

| Entity | Field | Constraint | Enforcement |
|--------|-------|------------|-------------|
| Job | task | 1-10000 chars | CHECK constraint |
| Job | status | Enum values | CHECK constraint |
| Job | allowed_tools | Valid tool names | Application validation |
| Job | metadata | Valid JSON | JSONB type |
| Profile | display_name | 1-60 chars | CHECK constraint |
| Profile | initials | 1-2 chars | CHECK constraint |
| Provider | details | Valid JSON | JSONB type |
| Plugin | config | Valid JSON | JSONB type |

### Referential Integrity

| Foreign Key | References | On Delete | On Update |
|-------------|------------|-----------|-----------|
| jobs.provider | providers.provider_id | NO ACTION | CASCADE |

---

## Data Access Patterns

### Read Patterns

| Query | Frequency | Index | Optimization |
|-------|-----------|-------|--------------|
| `SELECT * FROM jobs WHERE status = ?` | High | idx_jobs_status | Covering index |
| `SELECT * FROM jobs ORDER BY created_at DESC` | High | idx_jobs_created_at | Index scan |
| `SELECT * FROM providers` | Medium | None (small table) | Full scan OK |
| `SELECT * FROM jobs WHERE provider = ?` | Medium | idx_jobs_provider | Index scan |
| `SELECT * FROM profiles WHERE profile_id = ?` | Low | PK | PK lookup |

### Write Patterns

| Operation | Frequency | Transaction | Isolation |
|-----------|-----------|-------------|-----------|
| INSERT job | High | Single row | Read committed |
| UPDATE job status | High | Single row | Read committed |
| UPDATE provider | Medium | Single row | Read committed |
| INSERT audit log | High | Append only | No transaction |
| UPDATE profile | Low | Single row | Read committed |

---

## Backup & Recovery

### Backup Strategy

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| PGlite WAL | Continuous | Until checkpoint | `.wtagent/data/` |
| Full snapshot | Daily | 7 days | `.wtagent/backups/` |
| Audit log rotation | Daily | 30 days | `.wtagent/data/audit/` |

### Recovery Procedures

| Failure | Recovery | RTO | RPO |
|---------|----------|-----|-----|
| Database corruption | Restore from latest snapshot | 5 min | 24 hours |
| Audit log corruption | Start new log, lose current day | 1 min | 24 hours |
| Profile directory loss | Re-authenticate providers | 10 min | 0 (recreate) |
| Job queue loss | Jobs re-queued on restart | 1 min | 0 (in-memory jobs lost) |

---

## Data Migration Strategy

### Migration Process

1. Create migration SQL file: `migrations/003_add_job_ttl.sql`
2. Add checksum to migration registry
3. Run migration on startup
4. Verify schema version
5. Rollback on failure

### Example Migration

```sql
-- migrations/003_add_job_ttl.sql
ALTER TABLE jobs ADD COLUMN ttl_seconds INTEGER DEFAULT 1800;
ALTER TABLE jobs ADD COLUMN expires_at TIMESTAMP;

-- Backfill existing jobs
UPDATE jobs SET expires_at = created_at + (ttl_seconds * interval '1 second')
WHERE expires_at IS NULL;

-- Add index
CREATE INDEX idx_jobs_expires_at ON jobs(expires_at);

-- Register migration
INSERT INTO schema_migrations (version, checksum)
VALUES ('003', 'sha256:...');
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |