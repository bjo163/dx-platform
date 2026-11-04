# NeuralForge Master Blueprint — Target Architecture

## Document: 05-target-architecture.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Target Architecture Overview

The target architecture evolves from the current state by addressing identified gaps while preserving working functionality. Key changes:

1. **CI/CD Pipeline**: Automated testing and deployment
2. **Test Infrastructure**: 80%+ code coverage
3. **API Documentation**: OpenAPI spec with Swagger UI
4. **Security Hardening**: Rate limiting, authentication (optional)
5. **Observability**: Health dashboard, metrics, structured logging
6. **Containerization**: Docker support for consistent deployment
7. **Multi-Project**: Workspace switching support
8. **Plugin Registry**: Extensible tool system

---

## Architecture Diagram (Target)

```
┌─────────────────────────────────────────────────────────────────┐
│                    NeuralForge Target Ecosystem                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐     HTTP/SSE    ┌────────────────────────┐ │
│  │   Web UI        │ ──────────────► │   API Server (Fastify) │ │
│  │   (Next.js 15)  │                 │   + Rate Limiting      │ │
│  │   :3000         │                 │   :8080                │ │
│  └─────────────────┘                 └────────────────────────┘ │
│          │                                      │                │
│          │ WebSocket                            │                │
│          ▼                                      ▼                │
│  ┌─────────────────┐                 ┌────────────────────────┐ │
│  │  CI/CD Pipeline │                 │   Observability Stack  │ │
│  │  (GitHub Actions)│                │   - Metrics            │ │
│  │  - Test         │                 │   - Health Dashboard   │ │
│  │  - Build        │                 │   - Structured Logging │ │
│  │  - Deploy       │                 │   - Audit Logs         │ │
│  └─────────────────┘                 └────────────────────────┘ │
│                                              │                  │
│          ┌───────────────────────────────────┼────────────────┐ │
│          │                                   │                │ │
│   ┌──────▼──────┐                   ┌───────▼───────┐        │ │
│   │  Job Svc    │                   │  Database     │        │ │
│   │  (Queue +   │◄─────────────────►│  (PGlite +    │        │ │
│   │   Workers)  │                   │   WAL)        │        │ │
│   └─────────────┘                   └───────────────┘        │ │
│          │                                   │                │ │
│          │ HTTP                              │                │ │
│          ▼                                   ▼                │ │
│  ┌─────────────────────────────────────────────────────────┐  │ │
│  │                    Package Ecosystem                     │  │ │
│  │  + New: @neuralforge/errors  + New: @neuralforge/metrics        │  │ │
│  │  + New: @neuralforge/observability  + New: @neuralforge/docker  │  │ │
│  └─────────────────────────────────────────────────────────┘  │ │
│                                                                │ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    External Services                      │ │
│  │  - Docker Registry  - npm registry  - GitHub Packages    │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## New Components

### 1. CI/CD Pipeline (`/.github/workflows/`)
- **Purpose**: Automated testing, building, and deployment
- **Triggers**: Push to main, PR creation, release tags
- **Jobs**:
  - `test`: Run unit tests, integration tests
  - `build`: Build all packages, verify TypeScript
  - `lint`: ESLint, Prettier checks
  - `deploy`: Publish to npm, Docker Hub (on release)

### 2. Test Infrastructure (`/packages/tests/`)
- **Purpose**: 80%+ code coverage
- **Tools**: Vitest (unit), Playwright (E2E), MSW (API mocking)
- **Coverage**:
  - Unit: All packages
  - Integration: API endpoints, job execution
  - E2E: Web UI flows, provider login

### 3. Observability Stack (`/packages/observability/`)
- **Purpose**: Health monitoring, metrics, logging
- **Components**:
  - Metrics collector (CPU, memory, request latency)
  - Health dashboard (`/healthz` endpoint)
  - Structured logging (pino with JSON output)
  - Audit log viewer (Web UI)

### 4. Error Handling (`/packages/errors/`)
- **Purpose**: Consistent error types across packages
- **Exports**:
  - `NeuralForgeError` base class
  - `ValidationError`, `NotFoundError`, `ConflictError`
  - Error codes registry

### 5. Docker Support (`/Dockerfile`, `/docker-compose.yml`)
- **Purpose**: Consistent deployment environment
- **Multi-stage**:
  - Stage 1: Build (Node.js 20)
  - Stage 2: Runtime (Node.js 20-slim)
- **Services**:
  - `neuralforge-api`: Fastify server
  - `neuralforge-web`: Next.js server
  - `neuralforge-data`: Volume for PGlite

---

## Modified Components

### API Server Enhancements
- **Rate Limiting**: `@fastify/rate-limit` middleware
- **Authentication**: Optional JWT bearer token (future)
- **CORS Hardening**: Configurable origins, not wildcard
- **Request Tracing**: `X-Request-ID` header propagation

### Job Service Enhancements
- **Timeout**: Configurable TTL (default 30 minutes)
- **Parallelization**: Multiple concurrent workers
- **Dead Letter**: Failed jobs after max retries

### Web UI Enhancements
- **Provider Status Panel**: Real-time browser session state
- **Multi-Project Switcher**: Change workspace root
- **Audit Log Viewer**: Filterable JSONL log display
- **Plugin Manager**: Enable/disable/configure plugins

### Database Enhancements
- **Migration System**: Versioned schema changes
- **Backup/Restore**: Periodic snapshots
- **Indexing**: Optimized queries for jobs, providers

---

## Technology Additions

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **CI/CD** | GitHub Actions | Native GitHub integration, free for OSS |
| **Testing** | Vitest | Vite-native, fast, TypeScript support |
| **E2E** | Playwright Test | Cross-browser, reliable |
| **Mocking** | MSW (Mock Service Worker) | API mocking without network |
| **Metrics** | prom-client | Prometheus-compatible metrics |
| **Logging** | pino | Fast, structured JSON logging |
| **Container** | Docker | Industry standard, reproducible |

---

## Architecture Decisions

### Decision 1: Keep Monorepo Structure
- **Rationale**: 23 packages need clear dependency management
- **Alternative**: Split into separate repos (rejected: coordination overhead)
- **Consequence**: pnpm workspace required, single version for shared deps

### Decision 2: Embedded Database (PGlite)
- **Rationale**: Local-first, no external DB dependency
- **Alternative**: SQLite, PostgreSQL (rejected: adds complexity)
- **Consequence**: Limited to single-process access, WAL for durability

### Decision 3: Browser Automation (CDP)
- **Rationale**: No API keys, uses existing web accounts
- **Alternative**: Direct API integration (rejected: requires keys, costs)
- **Consequence**: DOM changes require adapter updates

### Decision 4: Optional Authentication
- **Rationale**: Local-first, single-user per instance
- **Alternative**: Mandatory OAuth2 (rejected: overkill for local use)
- **Consequence**: Security relies on OS-level access control

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |