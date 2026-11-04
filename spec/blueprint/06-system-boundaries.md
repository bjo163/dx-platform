# WTAgent Master Blueprint — System Boundaries

## Document: 06-system-boundaries.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## System Boundaries Overview

This document defines the architectural boundaries of the WTAgent system, specifying what belongs inside the system, what is external, and how they interact. Clear boundaries enable independent development, testing, and deployment.

---

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    WTAgent Trust Boundary                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐   UNTRUSTED ────────────────────────────┐ │
│  │   External      │                                        │ │
│  │   Providers     │  ┌──────────────────────────────────┐   │ │
│  │   (Web AI)      │  │  ChatGPT, Gemini, Grok,          │   │ │
│  │                 │  │  DeepSeek, GLM, Kimi             │   │ │
│  │  - No API keys  │  │  - DOM-based automation          │   │ │
│  │  - Session only │  │  - No code execution             │   │ │
│  └─────────────────┘  └──────────────────────────────────┘   │ │
│         │                      │                              │ │
│         │ HTTP/CDP             │                              │ │
│         ▼                      ▼                              │ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    WTAgent Core (TRUSTED)                │  │
│  │                                                          │  │
│  │  ┌─────────────────┐  ┌──────────────────────────────┐  │  │
│  │  │  API Gateway    │  │  Policy Engine               │  │  │
│  │  │  (Fastify)      │  │  - Sandbox enforcement       │  │  │
│  │  │  - Rate limit   │  │  - Approval workflow         │  │  │
│  │  │  - CORS         │  │  - Path guarding             │  │  │
│  │  │  - Auth (opt)   │  │  - Command filtering         │  │  │
│  │  └─────────────────┘  └──────────────────────────────┘  │  │
│  │          │                      │                        │  │
│  │  ┌───────▼──────────────────────▼─────────────────────┐  │  │
│  │  │              Job Execution Layer                   │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │  │  │
│  │  │  │ Job Svc  │ │ Browser  │ │ Tools            │   │  │  │
│  │  │  │ (Queue)  │ │ Pool     │ │ (fs, terminal)   │   │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────────────┘   │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                      │                                    │  │
│  │  ┌───────────────────▼────────────────────────────────┐  │  │
│  │  │              Persistence Layer                      │  │  │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │  │  │
│  │  │  │  Jobs DB   │ │ Providers  │ │ Plugins/       │   │  │  │
│  │  │  │  (PGlite)  │ │  DB        │ │ Profile DB     │   │  │  │
│  │  │  └────────────┘ └────────────┘ └────────────────┘   │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│         USER-CONTROLLED ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              User Workspace (FILESYSTEM)                 │  │
│  │  - Project files (read/write within sandbox)            │  │
│  │  - Terminal execution (danger-full-access only)         │  │
│  │  - Chrome profiles (isolated per provider)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Boundary Definitions

### 1. Network Boundary

| Boundary | Direction | Protocol | Security |
|----------|-----------|----------|----------|
| Web UI → API | Inbound | HTTP/1.1, SSE | CORS, Rate limit |
| API → Browser | Outbound | CDP (WebSocket) | Local only |
| API → File System | Outbound | Native FS | Sandbox guard |
| API → Terminal | Outbound | Process spawn | Command allowlist |

**Network Rules**:
- API binds to `127.0.0.1:8080` only (no external exposure by default)
- Web UI binds to `127.0.0.1:3000` only
- CDP connections to local Chrome instance only
- No outbound internet from API server

### 2. Data Boundary

| Data Type | Owner | Access | Persistence |
|-----------|-------|--------|-------------|
| Job Records | Job Service | Read/Write | PGlite (WAL) |
| Provider State | Browser Pool | Read/Write | PGlite + Profile dirs |
| Plugin Config | Plugin Registry | Read/Write | PGlite |
| User Profile | Profile Service | Read/Write | PGlite |
| Audit Logs | Policy Engine | Append only | JSONL files (7d retention) |
| Workspace Files | User | Read/Write | User filesystem |

**Data Rules**:
- No PII in audit logs (no credentials, no file content)
- Job payloads serialized as JSON (no binary)
- Profile directories encrypted at rest (future)
- PGlite database file in `.wtagent/data/`

### 3. Execution Boundary

| Component | Execution Context | Isolation |
|-----------|-------------------|-----------|
| API Server | Node.js process | Main process |
| Job Workers | Same process | Async tasks |
| Browser Instances | Separate Chrome processes | Profile isolation |
| Tool Execution | Same process | Policy guard |
| Terminal Commands | Child processes | Workdir restriction |

**Execution Rules**:
- All execution local (no remote execution)
- Browser instances: one per provider, headless optional
- Terminal commands: sandboxed by policy engine
- No shell=True (argument array only)

### 4. API Boundary

| Version | Base Path | Stability | Deprecation |
|---------|-----------|-----------|-------------|
| v1 | `/v1/` | Stable | 12 months notice |

**API Rules**:
- All endpoints return JSON
- Errors follow standard format
- Idempotency keys for POST (future)
- Version in URL path (not header)

### 5. Package Boundary

| Package | Public API | Internal | Consumers |
|---------|------------|----------|-----------|
| `@wtagent/types` | All types | None | All packages |
| `@wtagent/shared` | fetch, errors, limits | utils | Most packages |
| `@wtagent/platform` | paths, diagnostics | OS utils | Browser, tools |
| `@wtagent/protocol` | envelope, markers | internals | Browser, runtime |
| `@wtagent/tools` | Tool registry | executors | Job, runtime |
| `@wtagent/policy` | PolicyEngine, ApprovalManager | rules | Job, API |
| `@wtagent/browser` | WebAdapter, ProviderRegistry | adapters | Job, API |
| `@wtagent/job` | JobService | workers | API |
| `@wtagent/database` | WTagentDatabase | schema | API, Job |
| `@wtagent/runtime` | AgentRuntime | orchestrator | CLI, Job |
| `@wtagent/session` | SessionManager | storage | Runtime |

**Package Rules**:
- No circular dependencies
- Public API via `exports` in package.json
- Internal imports use `#internal` prefix (future)
- TypeScript project references for build speed

---

## Interface Contracts

### 1. Web UI ↔ API Server

```typescript
// All HTTP requests
const API_BASE = process.env.NEXT_PUBLIC_WTAGENT_API_URL ?? 'http://localhost:8080';

// Jobs
GET    /v1/jobs                 → JobRecord[]
POST   /v1/jobs                 → JobRecord (201)
GET    /v1/jobs/:id             → JobRecord
GET    /v1/jobs/:id/status      → JobStatus
POST   /v1/jobs/:id/cancel      → JobRecord
POST   /v1/jobs/:id/retry       → JobRecord
GET    /v1/jobs/:id/logs        → JobLogs
GET    /v1/jobs/:id/events      → SSE stream

// Providers
GET    /v1/providers            → ProviderState[]
POST   /v1/providers/:id/login  → {status: 'connecting'}
POST   /v1/providers/:id/verify → {authenticated: boolean}
DELETE /v1/providers/:id        → {authenticated: false}

// Profile
GET    /v1/profile              → Profile
PUT    /v1/profile              → Profile

// Plugins
GET    /v1/plugins              → Plugin[]
PUT    /v1/plugins/:id          → Plugin

// Health
GET    /health                  → {status: 'ok', port: number}
```

### 2. Job Service ↔ Browser Pool

```typescript
interface BrowserPool {
  getAdapter(providerId: string): Promise<WebAdapter>;
  releaseAdapter(providerId: string): Promise<void>;
  getStatus(providerId: string): Promise<ProviderState>;
}

interface WebAdapter {
  launch(): Promise<void>;
  close(): Promise<void>;
  sendMessage(message: string): Promise<MessageResponse>;
  waitForResponse(timeoutMs: number): Promise<MessageResponse>;
  getAuthState(): Promise<'authenticated' | 'unauthenticated' | 'unknown'>;
}
```

### 3. Job Service ↔ Tools

```typescript
interface ToolRegistry {
  getTool(name: string): Tool | undefined;
  execute(tool: string, params: unknown, context: ToolContext): Promise<ToolResult>;
  register(tool: Tool): void;
}

interface ToolContext {
  projectRoot: string;
  sandboxMode: 'workspace-read' | 'workspace-write' | 'danger-full-access';
  policyEngine: PolicyEngine;
  logger: Logger;
}
```

### 4. Tools ↔ Policy Engine

```typescript
interface PolicyEngine {
  evaluate(tool: string, params: unknown, context: PolicyContext): Promise<PolicyDecision>;
  requestApproval(tool: string, params: unknown, context: PolicyContext): Promise<ApprovalRecord>;
}

interface PolicyContext {
  projectRoot: string;
  sandboxMode: SandboxMode;
  userId: string;
  timestamp: string;
}

type PolicyDecision = 
  | { action: 'allow'; reason: string }
  | { action: 'deny'; reason: string }
  | { action: 'require_approval'; reason: string; approvalId: string };
```

---

## Boundary Enforcement

### 1. Compile-Time
- TypeScript strict mode
- Package `exports` field restricts imports
- ESLint rules: `no-restricted-imports` for internal APIs

### 2. Runtime
- Path guard validates all file operations
- Policy engine intercepts all tool calls
- Sandbox mode checked before every operation
- Command guard validates terminal commands

### 3. Deployment
- Docker network isolation (if containerized)
- OS user permissions (no root)
- Firewall rules (block outbound if needed)

---

## Boundary Evolution

| Phase | Boundary Changes |
|-------|------------------|
| **Current** | Single user, local only, no auth |
| **Phase 2** | Add rate limiting, CORS hardening |
| **Phase 3** | Add optional JWT auth, audit log viewer |
| **Phase 4** | Add multi-project (workspace switching) |
| **Phase 5** | Add Docker, monitoring, CI/CD |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |