# WTAgent Architecture Documentation

## System Overview

WTAgent is a local-first AI coding agent with web AI provider integration. The system is designed around a **job-based architecture** where user tasks are queued, executed, and tracked through completion.

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    WTAgent Ecosystem                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐     HTTP     ┌────────────────────────┐ │
│  │   Web UI        │ ───────────► │   API Server (Fastify) │ │
│  │   :3000         │            │   :8080                │ │
│  └─────────────────┘            └────────────────────────┘ │
│          │                         │                       │
│          │ WebSocket / SSE         │                       │
│          ▼                         ▼                       │
│  ┌─────────────────┐     ┌─────────────────────┐          │
│  │  Job Service    │◄────► │    Database (PGlite)│          │
│  │  (Job Queue)    │        │  (Job Storage)      │          │
│  └─────────────────┘     └─────────────────────┘          │
│          │                         │                       │
│          │ HTTP                    │                       │
│          ▼                         ▼                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Package Ecosystem                    │ │
│  │                                                       │ │
│  │  @wtagent/browser   @wtagent/job   @wtagent/database │ │
│  │  @wtagent/tools     @wtagent/policy @wtagent/platform │ │
│  │  @wtagent/protocol  @wtagent/session @wtagent/runtime │ │
│  │  @wtagent/types     @wtagent/shared @wtagent/mcp │ │
│  │  @wtagent/image     @wtagent/audio  @wtagent/cli │ │
│  │  @wtagent/sdk       @wtagent/artifacts @wkgents/config│ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Package Ecosystem

WTAgent uses a modular pnpm workspace with 23+ packages:

### Core Infrastructure Packages

| Package | Description | Key Dependencies |
|---------|-------------|------------------|
| `@wtagent/types` | Shared TypeScript types | typescript |
| `@wtagent/shared` | Shared utilities (fetch, usage limits, errors) | zod |
| `@wtagent/platform` | OS abstraction (paths, windows diagnostics) | typescript |
| `@wtagent/session` | Session management | typescript |
| `@wtagent/protocol` | Agent-provider communication protocol | typescript |

### Execution & Tool Packages

| Package | Description | Key Dependencies |
|---------|-------------|------------------|
| `@wtagent/tools` | Tool implementations (fs, terminal, search) | zodb, typescript |
| `@wtagent/job` | Job queue, execution, lifecycle management | @wtagent/types, @wtagent/shared |
| `@wtagent/browser` | Browser automation via CDP (Chrome DevTools Protocol) | playwright-core, typescript |
| `@wtagent/policy` | Security policy engine & approval flow | typescript |

### Media & Specialized Packages

| Package | Description | Key Dependencies |
|---------|-------------|------------------|
| `@wtagent/image` | Image generation providers (Gemini, Grok, ChatGPT) | typescript |
| `@wtagent/audio` | Music generation via Gemini | typescript |
| `@wtagent/mcp` | Model Context Protocol server | typescript |
| `@wtagent/sdk` | External integration SDK (browser adapter) | typescript |

### Application & Tool Packages

| Package | Description | Key Dependencies |
|---------|-------------|------------------|
| `@wtagent/runtime` | Agent runtime orchestration | typescript |
| `@wtagent/cli` | Command-line interface | typescript |
| `@wtagent/plugins` | Plugin system for extensibility | typescript |
| `@wtagent/artifacts` | Generated artifact handling | typescript |
| `@wtagent/config-api` | Configuration API | typescript |

## Trust Boundary Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Trust Boundary Diagram                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  UNTRUSTED  ┌─────────────────────┐ │
│  │   External      │ ──────────► │  Web AI Providers   │ │
│  │   Providers     │           │  (ChatGPT, Gemini)  │ │
│  └─────────────────┘           └─────────────────────┘ │
│                                                             │
│  ┌─────────────────┐  TRUSTED  ┌─────────────────────┐ │
│  │   Local Runtime │◄────────── │  WTAgent Core       │ │
│  │  (Sandboxed)    │           │  (Approval Engine)  │ │
│  └─────────────────┘           └─────────────────────┘ │
│                                                             │
│  ┌─────────────────┐  USER-CONTROLLED ────────────────────┐ │
│  │   User Workspace│                     (filesystem)   │ │
│  └─────────────────┘                                     │ │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Task Submission

```
User → Web UI → /v1/jobs (POST) → API Server
                                         │
                                         ▼
                                 Job Service (Queue)
                                         │
                                         ▼
                                Browser Pool → Provider
                                         │
                                         ▼
                                Tool Execution → Sandbox
                                         │
                                         ▼
                                Job Status → SSE → Web UI
```

### 2. Job Execution Lifecycle

```
1. Job Creation → pending
2. Job Worker picks up → running
3. Browser automation → provider interaction
4. Tool calls → policy approval → sandbox execution
5. Job completion → completed/failed
6. Status → Web UI via SSE
```

## Security Model

### Sandbox Modes

| Mode | Permissions | Use Case |
|------|-------------|----------|
| `workspace-read` | Read files under workspace | Code inspection, analysis |
| `workspace-write` | Read + write files under workspace | Code changes, file creation |
| `danger-full-access` | Full filesystem + terminal | Build commands, test execution |

### Approval Flow

```
Tool Call → Policy Engine Check → User Approval → Execute/Reject
```

All tool calls (`fs.read`, `fs.write`, `fs.edit`, `terminal.exec`) pass through the policy engine which:
1. Checks the current sandbox mode
2. Verifies the path is within allowed boundaries
3. Presents approval dialog to user (when required)
4. Logs all operations for audit

### Browser Session Isolation

- Each provider gets an isolated Chrome profile directory
- Profile directories are ephemeral and cleaned up on disconnect
- No credentials stored in plaintext
- Sessions validated via DOM probe before job execution

## Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Frontend** | Next.js | 15.5.29 | App Router |
| **Frontend** | React | 19.3.1 | Server Components |
| **Frontend** | TypeScript | 5.9.0 | Strict mode |
| **Backend** | Fastify | 5.12.8 | High-performance HTTP |
| **Database** | PGlite | embedded | SQLite-compatible in browser |
| **Browser** | Chrome DevTools Protocol | native | CDP automation |
| **Package Mgr** | pnpm | workspace | Yarn v2 compatible |
| **Test Runner** | vitest | ^3.2.4 | Vite-native |
| **CSS** | Tailwind-like | custom | CSS variables |

## API Endpoints Reference

### Jobs API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/v1/jobs` | POST | None | Create new job |
| `/v1/jobs` | GET | None | List all jobs |
| `/v1/jobs/:id` | GET | None | Get job details |
| `/v1/jobs/:id/status` | GET | None | Get job status |
| `/v1/jobs/:id/cancel` | POST | None | Cancel running job |
| `/v1/jobs/:id/retry` | POST | None | Retry failed job |
| `/v1/jobs/:id/logs` | GET | None | Get job logs |
| `/v1/jobs/:id/events` | GET | None | SSE event stream |

### Providers API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/v1/providers` | GET | None | List all providers |
| `/v1/providers/:id/login` | POST | None | Start login flow |
| `/v1/providers/:id/verify` | POST | None | Verify authentication |
| `/v1/providers/:id` | DELETE | None | Disconnect provider |

### Profile API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/v1/profile` | GET | None | Get user profile |
| `/v1/profile` | PUT | None | Update profile |

### Health API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Health check |

## Implementation Roadmap

### Phase 1: Foundation Hardening (Week 1-2)
- [x] Root README documentation
- [x] Environment templates (.env.example)
- [x] TypeScript project references
- [x] Shared error types package

### Phase 2: Observability & Quality (Week 3-4)
- [ ] Test infrastructure (Vitest config)
- [ ] Unit tests (core services)
- [ ] API documentation (OpenAPI spec)
- [ ] Health dashboard
- [ ] Error tracking integration

### Phase 3: Security & Hardening (Week 5-6)
- [ ] API authentication (token-based)
- [ ] CORS hardening
- [ ] Job timeout configuration
- [ ] Policy engine UI improvements
- [ ] Audit logging

### Phase 4: Feature Expansion (Week 7-8)
- [ ] Multi-project workspace support
- [ ] Plugin registry system
- [ ] Provider status panel
- [ ] Job parallelization
- [ ] Artifact preview

### Phase 5: Production Readiness (Week 9-10)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker containerization
- [ ] Performance profiling
- [ ] Load testing
- [ ] Release automation

## Known Issues & TODOs

| ID | Description | Owner | Priority |
|----|-------------|-------|----------|
| ISSUE-001 | No root-level documentation | Architecture | P0 |
| ISSUE-002 | Missing CI/CD pipeline | DevOps | P0 |
| ISSUE-003 | No test infrastructure | Engineering | P1 |
| ISSUE-004 | Environment config fragility | Engineering | P1 |
| ISSUE-005 | API lacks rate limiting | Engineering | P2 |
| ISSUE-006 | No authentication on API | Security | P1 |
| ISSUE-007 | Browser pool not visible in UI | UX | P2 |
| ISSUE-008 | Job timeout not configurable | Engineering | P2 |

## References

- [Package.json](apps/api/package.json)
- [Architecture Design](README.md)
- [API Specifications](packages/protocol/src/index.ts)
- [Tool Specifications](packages/tools/src/index.ts)
- [Job Service](packages/job/src/index.ts)
- [Browser Automation](packages/browser/src/index.ts)