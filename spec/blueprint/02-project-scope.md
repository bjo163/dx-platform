# WTAgent Master Blueprint — Project Scope

## Document: 02-project-scope.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Project Scope Definition

This document defines the exact boundaries of the WTAgent project, separating in-scope deliverables from out-of-scope features to prevent scope creep and maintain architectural focus.

### Scope Matrix

| Category | In-Scope Deliverables | Out-of-Scope (Future/Deferred) |
|----------|----------------------|-------------------------------|
| **Frontend** | Next.js 15 App Router UI<br>Workspace, Jobs, Providers, Plugins, Profile, Settings pages<br>Real-time SSE job updates<br>Responsive layout | Mobile app<br>Desktop app wrapper (Electron)<br>Dark/light theme toggle (dark only currently) |
| **Backend** | Fastify 5 API Gateway<br>Job Service & Queue<br>Provider Integration layer<br>Policy & Approval Engine<br>PGlite embedded database | Distributed backend<br>Microservices architecture<br>Kubernetes orchestration<br>Cloud-hosted API |
| **Providers** | ChatGPT, Gemini, Grok, DeepSeek, GLM, Kimi<br>Browser CDP automation<br>Isolated profile management | Direct API key providers (OpenAI API, Anthropic API)<br>Custom LLM self-hosted endpoints |
| **Tools** | `fs.read`, `fs.search`, `fs.write`, `fs.edit`, `terminal.exec`<br>Sandbox mode enforcement<br>Path guarding & command filtering | Database query tools<br>Network scraping tools<br>Cloud deployment tools |
| **Security** | Sandbox enforcement (workspace-read/write, danger)<br>Approval workflow<br>Audit logging (JSONL) | OAuth2 / OIDC authentication<br>Role-based access control (RBAC)<br>Encrypted database at rest |
| **Documentation** | Master blueprint (20 documents)<br>Technical specifications (5 core specs)<br>Architecture documentation<br>README & setup guides | Video tutorials<br>Commercial marketing site<br>Enterprise whitepapers |

---

## Functional Scope

### Core Capabilities
1. **Task Submission**: User submits natural language task via Web UI
2. **Job Queue**: Tasks queued, processed, and tracked with status updates
3. **Browser Automation**: CDP connects to provider web UI, sends prompt, parses response
4. **Tool Execution**: Agent invokes tools (fs, terminal) under sandbox constraints
5. **Approval Workflow**: Dangerous operations trigger user approval prompt
6. **Audit Trail**: All operations logged in JSONL audit log
7. **Session Management**: Chat sessions saved, resendable, and recoverable

### Non-Functional Scope
1. **Performance**: API latency <100ms, status polling <50ms, SSE broadcast <10ms
2. **Reliability**: WAL persistence survives restart, graceful error handling
3. **Security**: Path traversal prevention, command injection protection, profile isolation
4. **Maintainability**: Strict TypeScript (5.9), pnpm workspace monorepo, 23+ packages
5. **Portability**: macOS, Linux, Windows, WSL2 (WSLg)

---

## Deliverables

### Code Deliverables
- **`apps/web/`**: Next.js frontend application
- **`apps/api/`**: Fastify backend application
- **`packages/`**: 23+ workspace packages (browser, job, database, tools, policy, platform, etc.)

### Documentation Deliverables
- **`README.md`**: Project overview, quick start, installation, API reference
- **`ARCHITECTURE.md`**: System architecture, package dependencies, trust boundaries
- **`spec/blueprint/`**: Master engineering blueprint (20 documents)
- **`spec/blueprint/01-job-service.md`**: Job Service specification
- **`spec/blueprint/02-provider-integration.md`**: Provider Integration specification
- **`spec/blueprint/03-tools-specification.md`**: File System Tools specification
- **`spec/blueprint/04-policy-engine.md`**: Policy Engine specification
- **`spec/blueprint/05-api-specification.md`**: OpenAPI Specification

---

## Constraints & Assumptions

### Constraints
1. **No API Keys**: Must rely solely on browser session automation
2. **Local-First**: Must run on user machine without cloud servers
3. **Browser Dependency**: Requires Chrome/Chromium installed locally
4. **Workspace Boundary**: File operations restricted to workspace root (unless danger mode)
5. **Single-User**: Designed for single developer per local instance

### Assumptions
1. Users have valid web accounts for target AI providers
2. Chrome DevTools Protocol (CDP) available via local connection
3. Node.js 20+ environment available
4. pnpm package manager installed
5. Operating system supports local process spawning

---

## Acceptance Criteria for Scope

1. ✅ All in-scope features implemented or specified
2. ✅ Out-of-scope items explicitly documented as excluded
3. ✅ Constraints adhered to in architecture and specifications
4. ✅ Assumptions validated against actual repository evidence
5. ✅ Deliverables accounted for in project roadmap

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |