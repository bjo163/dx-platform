# WTAgent Master Blueprint — Migration Strategy

## Document: 17-migration-strategy.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Migration Strategy Overview

WTAgent's migration strategy addresses scenarios involving framework upgrades, provider changes, data model evolution, and architecture modifications. This document defines current-state analysis, target-state design, and transition plans.

---

## Current-State Analysis

### Existing Infrastructure

| Component | Current Version | Technology | Notes |
|-----------|----------------|------------|-------|
| API Server | 1.0.0 | Fastify 5 + TypeScript 5.9 | Working, no auth |
| Web UI | 1.0.0 | Next.js 15 + React 19 | Working, no CORS restrictions |
| Database | 1.0.0 | PGlite 0.5.15 | Embedded, WAL enabled |
| Browser Pool | 1.0.0 | Playwright 1.62.0 | 6 providers, isolated profiles |
| Tools | 1.0.0 | Custom (fs, terminal) | 5 tools, sandbox enforcement |
| Policy Engine | 1.0.0 | YAML rules + runtime eval | Approval workflow |

### Current Capabilities

- Job creation, execution, cancellation, retry
- 6 provider integrations (CDP-based)
- File system tools (read/search/write/edit/terminal)
- Sandbox modes (workspace-read, workspace-write, danger-full-access)
- Policy approval workflow
- SSE real-time job updates

### Known Limitations (Current State)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No CI/CD pipeline | Manual testing/deployment | Plan Phase 5 |
| No test infrastructure | 0% code coverage | Plan Phase 2 |
| No rate limiting | Potential abuse | Plan Phase 3 |
| No authentication | Security risk if exposed | Plan Phase 3 |
| Single workspace | Single project limitation | Plan Phase 4 |
| Manual deployment | Inconsistent environments | Plan Phase 5 |

---

## Target-State Design

### Phase 1: Foundation (Week 1-2)
- [x] CI/CD pipeline (GitHub Actions)
- [x] Test infrastructure (Vitest + Playwright)
- [x] OpenAPI documentation
- [x] Rate limiting

### Phase 2: Security (Week 3-4)
- [ ] Optional JWT authentication
- [ ] Hardened CORS configuration
- [ ] Job timeout configuration
- [ ] Audit log viewer

### Phase 3: Multi-Project (Week 5-6)
- [ ] Workspace switching UI
- [ ] Multi-root project support
- [ ] Project-specific tool configurations

### Phase 4: Observability (Week 7-8)
- [ ] Prometheus metrics endpoint
- [ ] Grafana dashboards
- [ ] Structured logging viewer
- [ ] Alerting thresholds

### Phase 5: Production (Week 9-10)
- [ ] Docker production image
- [ ] Kubernetes manifests
- [ ] Monitoring & alerting setup
- [ ] Documentation completion

### Full Target State

| Component | Target Version | Technology | Status |
|-----------|---------------|------------|--------|
| API Server | 2.0.0 | Fastify 5 + TypeScript 5.9 | Planned |
| Web UI | 2.0.0 | Next.js 16 + React 19 | Planned |
| Database | 2.0.0 | PGlite 0.5.x + migrations | Planned |
| Browser Pool | 2.0.0 | Playwright 1.62.0 + selectors | Planned |
| Tools | 2.0.0 | Enhanced (validation, limits) | Planned |
| Policy Engine | 2.0.0 | Rule caching + hot reload | Planned |

---

## Migration Types

### 1. Package Version Migration

| Scenario | From | To | Steps |
|----------|------|----|-------|
| Minor upgrade | `1.0.3` → `1.1.0` | `pnpm update` | `pnpm run build` |
| Major upgrade | `1.0.0` → `2.0.0` | Manual | See migration guide |
| Pin to workspace | Always use `workspace:*` | No change | `pnpm install` |

### 2. Dependency Migration

| Scenario | Change | Impact |
|----------|--------|--------|
| Add new package | `pnpm add @wtagent/new-package` | New exports |
| Remove package | `pnpm remove @wtagent/old` | Remove imports |
| Version pin | `pnpm lockfile` update | Reinstall deps |
| Switch package | Replace `@wtagent/a` with `@wtagent/b` | Update imports |

### 3. Schema Migration

| Migration | Description | Steps |
|-----------|-------------|-------|
| `001` → `002` | Add `project_root` to jobs table | Add column, backfill, update code |
| `002` → `003` | Add `ttl_seconds` to jobs | Add column, update defaults |
| `003` → `004` | Add migrations table | CREATE TABLE, register version |

### Migration Example

```sql
-- migrations/002-add-ttl.sql
BEGIN;

-- Add new columns
ALTER TABLE jobs ADD COLUMN ttl_seconds INTEGER DEFAULT 1800;
ALTER TABLE jobs ADD COLUMN expires_at TIMESTAMP;

-- Backfill existing jobs
UPDATE jobs 
SET expires_at = created_at + (ttl_seconds * interval '1 second')
WHERE expires_at IS NULL;

-- Verify data integrity
SELECT job_id, created_at, expires_at 
FROM jobs 
WHERE expires_at IS NULL;

-- Register migration
INSERT INTO schema_migrations (version, checksum)
VALUES ('002', 'sha256:');

COMMIT;
```

### 4. Provider Migration

| Scenario | From | To | Steps |
|----------|------|----|-------|
| Add provider | New provider | Register adapter, add to registry | Implement WebAdapter |
| Remove provider | Unused provider | Remove from registry, delete profile | Cleanup profile dir |
| Switch default | `chatgpt` → `gemini` | Update WTAGENT_PROVIDER env | Re-verify session |

### 5. Configuration Migration

| Scenario | From | To | Steps |
|----------|------|----|-------|
| Add env var | New variable | Add to `.env.example`, update code | Default + override |
| Rename env var | `OLD_NAME` → `NEW_NAME` | Update all references | Search/replace |
| Change default | `PORT=8080` → `PORT=3000` | Update `.env.example` | Documentation |

---

## Migration Tools

### Migration Script Template

```typescript
// scripts/migrate.ts
import { migrate } from '@wtagent/database';

async function main() {
  const db = await migrate({
    migrationsDir: './packages/database/migrations',
    currentVersion: '1.0.0',
    targetVersion: '1.1.0',
  });
  
  console.log(`Migrated to v${db.schemaVersion}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
}
```

### Migration Verification

```bash
# Run migration
pnpm run migrate -- --from 1.0.0 --to 1.1.0

# Verify schema version
pnpm run migrate:status

# Rollback if needed
pnpm run migrate:rollback --to 1.0.0
```

---

## Rollback Strategy

### Migration Rollback Triggers

| Trigger | Action | RTO |
|---------|--------|-----|
| Migration fails mid-way | Automatic rollback to previous version | < 5 min |
| New schema causes runtime errors | Automatic rollback | < 10 min |
| Data corruption detected | Manual intervention | < 30 min |
| Performance regression | Manual decision | < 1 hour |

### Rollback Procedure

```bash
# Rollback migration
pnpm run migrate:rollback --to 1.0.0

# Or manually
# 1. Restore database from backup
# 2. Revert code changes
# 3. Restart application
# 4. Verify functionality
```

### Rollback Checklist

- [ ] Database backup confirmed
- [ ] Previous version code deployed
- [ ] Profile directories unchanged
- [ ] Audit logs preserved
- [ ] Smoke test suite passes
- [ ] Stakeholder notification sent

---

## Compatibility Matrix

| Migration Type | Backward Compatible | Forward Compatible | Notes |
|----------------|--------------------|-------------------|-------|
| Package minor | ✅ Yes | ⚠️ Some features | `workspace:*` pins help |
| Package major | ❌ No | ✅ With shim | Requires code changes |
| Schema migration | ⚠️ Partial | ❌ Breaking | WAL helps rollback |
| Provider add | ✅ Yes | ✅ Yes | New adapter only |
| Provider remove | ⚠️ Partial | ❌ Yes | Lose provider access |
| Config change | ⚠️ Partial | ⚠️ Partial | Env var rename needed |

---

## Migration Checklist

### Pre-Migration

- [ ] All tests passing (80%+ coverage)
- [ ] Database backup created
- [ ] Profile directories verified
- [ ] Audit logs archived
- [ ] Rollback plan documented
- [ ] Stakeholder notification sent

### During Migration

- [ ] Migration script executed
- [ ] Schema version updated
- [ ] Data integrity verified
- [ ] Code imports updated
- [ ] Tests re-run
- [ ] Coverage verified

### Post-Migration

- [ ] All tests passing
- [ ] Manual verification complete
- [ ] Documentation updated
- [ ] Team notified
- [ ] Rollback tested (optional)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |