# NeuralForge Master Blueprint — Deployment Strategy

## Document: 16-deployment-strategy.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Deployment Strategy Overview

NeuralForge's deployment strategy covers release processes, environment promotion, configuration management, and rollback procedures. This document defines how new versions are delivered to users.

---

## Deployment Environments

| Environment | Purpose | Trigger | Promotion Criteria |
|-------------|---------|---------|-------------------|
| **Local** | Development & testing | Developer workstation | `pnpm run build` passes |
| **Staging** | Pre-production validation | CI pipeline | All tests pass + manual sign-off |
| **Production** | User deployment | `git tag vX.Y.Z` | Staging approved + smoke tests |

### Environment Parity

- **Infrastructure**: Same Docker images, same config schema
- **Data**: Staging uses synthetic data, prod uses real user data
- **Dependencies**: Same exact versions (pnpm lockfile)
- **Environment Variables**: `.env.staging` → `.env.production`

### Promotion Criteria

1. ✅ All unit & integration tests pass
2. ✅ E2E tests pass
3. ✅ Code coverage >= 80%
4. ✅ Linting passes
5. ✅ Security scan clean
6. ✅ Smoke test suite passes
7. ✅ Manual approval from lead

---

## Release Process

### Release Checklist

| Step | Description | Status |
|------|-------------|--------|
| 1. Version bump | Update package.json, .env.example | Manual |
| 2. Changelog update | Add version entry to CHANGELOG.md | Manual |
| 3. Build artifacts | `pnpm run build` | CI |
| 4. Run tests | `pnpm run test:cov` | CI |
| 8. Publish packages | `pnpm publish --access restricted` | CI |
| 9. Deploy Docker image | `docker build + push` | CI/CD |
| 10. Update docs | Update README, ARCHITECTURE | Manual |
| 11. Notify team | Slack/email notification | Manual |

### Git Workflow

```bash
# Feature branch
git checkout -b feature-xyz

# Development
git add .
git commit -m "feat: add xyz"

# Pull request
git push origin feature-xyz

# Review + merge
git checkout main
git merge feature-xyz

# Tag release
git tag v1.0.0
git push origin v1.0.0  # Triggers CI/CD

# Release notes
cat CHANGELOG.md | head -50
```

### Release Tags

```
v0.1.0 — Initial package structure
v0.5.0 — Core job system + providers
v1.0.0 — MVP release (all core features)
v1.1.0 — Plugin system + multi-project
v2.0.0 — Docker + CI/CD + observability
```

---

## Configuration Management

### Environment Variable Migration

| Stage | .env.local | .env.staging | .env.production |
|-------|------------|--------------|-----------------|
| Dev | PORT=3000 | PORT=8080 | PORT=8080 |
| API | WTAGENT_PROVIDER=chatgpt | WTAGENT_PROVIDER=chatgpt | WTAGENT_PROVIDER=chatgpt |
| Path | WTAGENT_DATA_DIR=.neuralforge | WTAGENT_DATA_DIR=.neuralforge | WTAGENT_DATA_DIR=/data |

### Configuration Validation

```typescript
// config-api/src/index.ts
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.string().default('8080'),
  WTAGENT_DATA_DIR: z.string().default('.neuralforge'),
  WTAGENT_PROJECT_ROOT: z.string().default('auto'),
  WTAGENT_PROVIDER: z.enum(['chatgpt', 'gemini', 'grok', 'deepseek', 'glm', 'kimi']).default('chatgpt'),
  NEXT_PUBLIC_WTAGENT_API_URL: z.string().default('http://localhost:8080'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function validateEnv(partial: Partial<EnvConfig>): EnvConfig {
  return EnvSchema.parse(partial);
}
```

### Configuration Hierarchy

```
1. CLI arguments (highest priority)
2. Environment variables
3. .env.local (not committed)
4. .env (committed, fallback)
5. Defaults (lowest priority)
```

---

## Rollback Strategy

### Rollback Triggers

| Trigger | Action | RTO |
|---------|--------|-----|
| Health check failure after deploy | Automatic rollback | < 5 min |
| Critical error rate spike | Manual rollback | < 10 min |
| Data migration failure | Automatic rollback | < 10 min |
| Provider API breaking change | Manual rollback | < 30 min |

### Rollback Procedure

```bash
# Rollback to previous version
docker pull neuralforge/api:v1.0.0
docker compose up -d api@v1.0.0

# Or via Git
git checkout v1.0.0
git push origin v1.0.0  # Force push if needed

# Or via CI
pnpm run release:rollback --version v1.0.0
```

### Rollback Checklist

- [ ] Previous version Docker image available
- [ ] Database compatible (no schema breaks)
- [ ] Profile directories unchanged
- [ ] Audit logs preserved
- [ ] Smoke test suite passes
- [ ] Stakeholder notification sent

---

## Artifact Management

### Generated Artifacts

| Artifact Type | Storage Location | Retention | Cleanup |
|---------------|-----------------|-----------|---------|
| Native images | `.neuralforge/artifacts/native-images/` | 90 days | Garbage collect |
| Music tracks | `.neuralforge/artifacts/music/` | 90 days | Garbage collect |
| Job results | `.neuralforge/data/` | 7 days (PGlite) | VACUUM |
| Audit logs | `.neuralforge/data/audit/` | 30 days (rotated) | Rotate daily |

### Artifact Cleanup Script

```bash
#!/bin/bash
# Cleanup artifacts older than 90 days
find .neuralforge/artifacts/native-images/ -type f -mtime +90 -delete
find .neuralforge/artifacts/music/ -type f -mtime +90 -delete

# Rotate audit logs older than 30 days
find .neuralforge/data/audit/*.jsonl -mtime +30 -delete
gzip .neuralforge/data/audit/$(ls -1t .neuralforge/data/audit/*.jsonl | tail -1)
```

---

## Infrastructure as Code

### Terraform (Future)

```hcl
# terraform/main.tf
resource "docker_image" "neuralforge_api" {
  name = "neuralforge/api:${var.version}"
  pull_options = ["--platform", "linux/amd64"]
}

resource "local_file" ".env.production" {
  content = templatefile(".env.tmpl", {
    version = var.version
  })
  path = "./.env.production"
}
```

### Ansible (Future)

```yaml
# ansible/roles/neuralforge/tasks/main.yml
- name: Deploy NeuralForge API
  docker_container:
    name: neuralforge_api
    image: neuralforge/api:{{ .Version }}
    state: started
    restart_policy: always
    published_ports:
      - "8080:8080"
    env:
      - PORT=8080
      - WTAGENT_DATA_DIR=.neuralforge
```

---

## Monitoring During Deployment

### Pre-Deployment Checks

| Check | Command | Expected |
|-------|---------|----------|
| Build | `pnpm run build` | Exit 0 |
| Tests | `pnpm run test:cov` | Coverage >= 80% |
| Lint | `pnpm run lint` | Exit 0 |
| Health pre-check | `curl -s http://localhost:8080/health` | `{"status":"ok"}` |

### Post-Deployment Checks

| Check | Command | Expected |
|-------|---------|----------|
| Health post-check | `curl -s http://localhost:8080/health` | `{"status":"ok"}` |
| Provider list | `curl -s http://localhost:8080/v1/providers` | Valid providers |
| Job creation test | `curl -s -X POST http://localhost:8080/v1/jobs` | `{"jobId":"..."}` |
| SSE stream test | `curl -s -N http://localhost:8080/v1/jobs/:id/events` | Events stream |

### Deployment Smoke Test Suite

```bash
#!/bin/bash
# smoke-test.sh

set -e

echo "Running deployment smoke tests..."

# 1. Health check
if ! curl -s http://localhost:8080/health | grep -q '"status":"ok"'; then
  echo "FAIL: Health check failed"
  exit 1
fi

# 2. Provider list
if ! curl -s http://localhost:8080/v1/providers | grep -q 'chatgpt'; then
  echo "FAIL: Provider list failed"
  exit 1
fi

# 2. Job creation
RESPONSE=$(curl -s -X POST http://localhost:8080/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"task":"test task","provider":"chatgpt"}')
if ! echo "$RESPONSE" | grep -q '"jobId"'; then
  echo "FAIL: Job creation failed"
  exit 1
fi

echo "All smoke tests passed!"
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |