# NeuralForge Master Blueprint — Infrastructure Architecture

## Document: 13-infrastructure-architecture.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Infrastructure Architecture Overview

NeuralForge's infrastructure architecture defines the deployment environment, containerization, networking, configuration management, and operational tooling. This document covers the infrastructure required for production deployment.

---

## Deployment Environments

| Environment | Purpose | Configuration | Access |
|-------------|---------|---------------|--------|
| **Development** | Local development | `npm run dev`, `pnpm dev` | `http://localhost:3000`, `http://localhost:8080` |
| **Testing** | CI/CD pipeline | `pnpm run test`, `pnpm run build` | CI runner |
| **Staging** | Pre-production validation | Docker, same as prod | Internal network |
| **Production** | User deployment | Docker, systemd, or manual | Local machine |

---

## Containerization

### Docker Architecture

```dockerfile
# Multi-stage Dockerfile
# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Stage 2: Runtime
FROM node:20-slim AS runtime

WORKDIR /app
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /app/apps/web/.next/ ./apps/web/.next/

EXPOSE 8080 3000
CMD ["node", "apps/api/dist/index.js"]
```

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - ./neuralforge-data:/app/.neuralforge
    environment:
      - PORT=8080
      - WTAGENT_DATA_DIR=/app/.neuralforge
      - WTAGENT_PROJECT_ROOT=/app
    restart: unless-stopped

  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_WTAGENT_API_URL=http://localhost:8080
    command: pnpm --filter @neuralforge/web dev
    volumes:
      - ./apps/web/src:/app/apps/web/src
      - ./packages/:/app/packages/
    restart: unless-stopped

  data:
    image: busybox
    volumes:
      - ./neuralforge-data:/app/.neuralforge
    command: ["sleep", "infinity"]
```

### Kubernetes Manifest (Future)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neuralforge-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: neuralforge-api
  template:
    metadata:
      labels:
        app: neuralforge-api
    spec:
      containers:
      - name: api
        image: neuralforge/api:latest
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
        - name: WTAGENT_DATA_DIR
          value: "/data"
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: neuralforge-data-pvc
```

---

## Configuration Management

### Environment Variables

| Variable | Default | Description | Scope |
|----------|---------|-------------|-------|
| `PORT` | `8080` | API server port | API |
| `WTAGENT_DATA_DIR` | `.neuralforge` | Data directory | API |
| `WTAGENT_PROJECT_ROOT` | `auto` | Project root directory | API |
| `WTAGENT_PROVIDER` | `chatgpt` | Default provider | API |
| `NEXT_PUBLIC_WTAGENT_API_URL` | `http://localhost:8080` | API URL for web | Web |
| `NODE_ENV` | `development` | Environment | All |
| `WTAGENT_CHROME_PATH` | `auto` | Chrome executable path | API |

### Configuration Files

| File | Purpose | Format | Security |
|------|---------|--------|----------|
| `.env` | Runtime configuration | KEY=VALUE | 0600, not committed |
| `.env.example` | Template for .env | KEY=VALUE | Committed |
| `pnpm-workspace.yaml` | Workspace config | YAML | Committed |
| `tsconfig.json` | TypeScript config | JSON | Committed |

---

## Networking

### Port Assignments

| Service | Port | Protocol | Access |
|---------|------|----------|--------|
| API Server | 8080 | HTTP/1.1 | 127.0.0.1 only |
| Web UI | 3000 | HTTP/1.1 | 127.0.0.1 only |
| Chrome CDP | 9222+ | WebSocket | 127.0.0.1 only |
| Health Check | 8080 | HTTP/GET | 127.0.0.1 only |

### Network Isolation

- API server binds to `127.0.0.1` only
- Web UI binds to `127.0.0.1` only
- Chrome instances bind to `127.0.0.1` only
- No external port exposure
- Firewall rules block outbound if needed

---

## Storage

### Data Directory Structure

```
.neuralforge/
├── data/
│   ├── jobs.db          # PGlite database
│   └── migrations/      # Schema migrations
├── profiles/
│   ├── chatgpt/         # ChatGPT profile
│   ├── gemini/          # Gemini profile
│   └── grok/            # Grok profile
├── audit/
│   ├── current.jsonl    # Active audit log
│   └── 2024-01-15.jsonl.gz # Rotated logs
├── artifacts/
│   ├── native-images/   # Generated images
│   └── music/           # Generated music
└── logs/
    ├── api.log          # API server logs
    └── browser.log      # Browser automation logs
```

### Storage Policies

| Resource | Quota | Retention | Cleanup |
|----------|-------|-----------|---------|
| Database | 1GB max | Until deleted | VACUUM on restart |
| Profiles | 500MB max | Until disconnect | DELETE on disconnect |
| Audit Logs | 1GB max | 7 days (active), 30 days (rotated) | Rotate daily |
| Artifacts | 2GB max | 90 days | Garbage collect |
| Logs | 500MB max | 30 days | Rotate daily |

---

## Observability Infrastructure

### Metrics Collection

| Metric | Type | Labels | Collection |
|--------|------|--------|------------|
| `http_requests_total` | Counter | method, endpoint, status | Prometheus |
| `http_request_duration_seconds` | Histogram | method, endpoint | Prometheus |
| `job_queue_length` | Gauge | status | Prometheus |
| `job_duration_seconds` | Histogram | provider, status | Prometheus |
| `browser_memory_bytes` | Gauge | provider | Prometheus |
| `tool_executions_total` | Counter | tool, success | Prometheus |
| `approval_requests_total` | Counter | tool, decision | Prometheus |

### Logging

| Log Type | Format | Destination | Rotation |
|----------|--------|-------------|----------|
| API Server | JSON | File + stdout | Daily |
| Browser Automation | JSON | File + stdout | Daily |
| Job Execution | JSON | File + stdout | Daily |
| Audit Logs | JSONL | File only | 7-day retention |
| Error Reports | JSON | File only | 30-day retention |

### Health Checks

| Endpoint | Check | Timeout | Retry |
|----------|-------|---------|-------|
| `/health` | API responsiveness | 1s | 3 retries |
| `/v1/providers` | Provider connectivity | 5s | 1 retry |
| `/v1/jobs` | Database connectivity | 2s | 3 retries |
| `/v1/providers/:id/verify` | Browser session | 30s | 1 retry |

---

## Security Infrastructure

### OS Hardening

| Control | Implementation |
|---------|----------------|
| Non-root user | `USER node` in Docker |
| Minimal privileges | `no-new-privileges`, `cap-drop` |
| Read-only root | `readOnlyRootFilesystem` (K8s) |
| Drop capabilities | `CAP_NET_RAW`, `CAP_SYS_ADMIN` |
| Non-root group | `runAsNonRoot`, `fsGroup` |

### Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| None | N/A | No API keys used |
| Profile dirs | File system (0700) | Owner only |
| Audit logs | File system (0600) | Owner only |
| Database | File system (0600) | Owner only |

### Network Security

| Control | Implementation |
|---------|----------------|
| No external ports | Bind to 127.0.0.1 only |
| No outbound network | Firewall rules (optional) |
| DNS restriction | Local only |
| IPv6 disabled | sysctl net.ipv6.conf.all.disable_ipv6=1 |

---

## Backup & Disaster Recovery

### Backup Strategy

| Resource | Frequency | Retention | Storage |
|----------|-----------|-----------|---------|
| Database | Daily | 7 days | Local backup dir |
| Profiles | On disconnect | Indefinite | User directory |
| Audit Logs | Rotate daily | 30 days | Local backup dir |
| Config | On change | 90 days | Git |

### Recovery Procedures

| Scenario | RTO | RPO | Steps |
|----------|-----|-----|-------|
| Database corruption | 5 min | 24 hours | Restore from snapshot |
| Profile loss | 10 min | 0 | Re-authenticate providers |
| Audit log loss | 1 min | 24 hours | Start new log |
| Config loss | 1 min | 0 | Recreate from .env.example |
| Total system loss | 30 min | 24 hours | Reinstall + restore backups |

---

## Monitoring & Alerting

### Alert Thresholds

| Metric | Warning | Critical | Duration |
|--------|---------|----------|----------|
| API latency (p95) | 100ms | 500ms | 5 min |
| Error rate | 1% | 5% | 5 min |
| Job queue length | 50 | 200 | 5 min |
| Browser memory | 1GB | 1.5GB | 10 min |
| Disk usage | 80% | 95% | 1 hour |
| Health check failure | 1 | 3 | 2 min |

### Notification Channels

| Channel | Severity | Destination |
|---------|----------|-------------|
| Console | Warning | Terminal |
| File | All | Log files |
| Email | Critical | Admin email |
| Webhook | Critical | Slack/Discord |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |