# NeuralForge Master Blueprint — Requirements

## Document: 03-requirements.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Functional Requirements

### FR-001: Job Creation
- **Description**: System shall accept task submission via `/v1/jobs` POST endpoint
- **Inputs**: task (non-empty string), provider (optional, defaults to chatgpt), projectRoot (absolute path), allowedTools (array), metadata (object)
- **Outputs**: jobId, status, provider, projectRoot, createdAt, updatedAt
- **Priority**: Must

### FR-002: Job Status Tracking
- **Description**: System shall track and expose job status through lifecycle
- **States**: pending → running → completed/failed/cancelled
- **Exposure**: GET /v1/jobs/:id/status, GET /v1/jobs/:id/events (SSE)
- **Priority**: Must

### FR-003: Provider Authentication
- **Description**: System shall support 6 web AI providers via browser automation
- **Providers**: chatgpt, gemini, grok, deepseek, glm, kimi
- **Flow**: Login → Verify → Authenticated → Job Execution
- **Priority**: Must

### FR-004: File System Tools
- **Description**: System shall provide sandboxed file operations
- **Tools**: fs.read, fs.search, fs.write, fs.edit, terminal.exec
- **Sandbox Modes**: workspace-read, workspace-write, danger-full-access
- **Priority**: Must

### FR-005: Approval Workflow
- **Description**: Dangerous operations require user approval
- **Trigger**: fs.edit, fs.write(existing), terminal.exec(new command)
- **Dialog**: Show tool, path, risk; Allow/Deny/Remember
- **Priority**: Must

### FR-006: Job Cancellation
- **Description**: System shall support cancellation of running jobs
- **Endpoint**: POST /v1/jobs/:id/cancel
- **Behavior**: Stop execution, mark status cancelled, emit event
- **Priority**: Should

### FR-007: Job Retry
- **Description**: System shall support retry of failed jobs
- **Endpoint**: POST /v1/jobs/:id/retry
- **Behavior**: Reset to pending, re-execute with backoff
- **Priority**: Should

### FR-008: Log Retrieval
- **Description**: System shall capture and expose job logs
- **Content**: stdout, stderr, transcript (role/content pairs)
- **Endpoint**: GET /v1/jobs/:id/logs
- **Format**: JSON with transcript array + stdout + stderr
- **Priority**: Must

### FR-009: Provider Status Dashboard
- **Description**: System shall expose provider connection state
- **Endpoints**: GET /v1/providers
- **State Fields**: configured, authenticated, supported, guidance, lastVerifiedAt
- **Priority**: Must

### FR-010: Profile Management
- **Description**: System shall manage user profile (display name, initials)
- **Endpoints**: GET /v1/profile, PUT /v1/profile
- **Fields**: profile_id, display_name (1-60 chars), initials (1-2 chars)
- **Priority**: Must

### FR-011: Plugin System
- **Description**: System shall support extensible plugin registry
- **Built-ins**: github, jira (id, name, version, enabled, capabilities)
- **Operations**: PUT /v1/plugins/:id (enable/disable, config)
- **Priority**: Could

### FR-012: Health Monitoring
- **Description**: System shall expose health check endpoint
- **Endpoints**: GET /health
- **Response**: status, port, uptime, version
- **Priority**: Must

---

## Non-Functional Requirements

### NFR-001: API Latency
- **Requirement**: Health check <1ms, job status <50ms, job creation <100ms
- **Measurement**: 95th percentile over 1000 requests
- **Priority**: Must

### NFR-002: API Throughput
- **Requirement**: 1000+ requests/sec sustained, 100 concurrent job creations
- **Measurement**: Load test over 30 seconds
- **Priority**: Must

### NFR-003: Browser Automation Reliability
- **Requirement**: Provider DOM changes handled with fallback selectors, <30s login timeout
- **Measurement**: DOM probe validation, login flow success rate
- **Priority**: Must

### NFR-004: Sandbox Security
- **Requirement**: No path traversal outside workspace (workspace-read/write), no command injection
- **Measurement**: Penetration testing, boundary validation
- **Priority**: Must

### NFR-004: Audit Logging Completeness
- **Requirement**: 100% of tool operations logged to JSONL, 7-day retention
- **Format**: `{"timestamp":"...","tool":"...","action":"...","decision":"...","user":"user"}`
- **Priority**: Must

### NFR-005: Data Persistence
- **Requirement**: Job database survives API restart (PGlite WAL), profile directories persistent
- **Measurement**: Restart test, job reappearance verification
- **Priority**: Must

### NFR-006: Type Safety
- **Requirement**: 100% TypeScript coverage for public APIs, strict mode enabled
- **Measurement**: TypeScript compiler errors = 0
- **Priority**: Should

### NFR-007: CORS Configuration
- **Requirement**: Configurable origins, default localhost:3000, production origin allowed
- **Headers**: access-control-allow-origin, access-control-allow-methods, access-control-allow-headers
- **Priority**: Must

### NFR-008: Rate Limiting
- **Requirement**: Per-IP, per-endpoint limits, 429 with Retry-After header
- **Default**: 100 requests/minute
- **Priority**: Should

---

## Requirement Prioritization

| Priority | Count | Description |
|----------|-------|-------------|
| **Must** | 12 | Critical functionality, cannot ship without |
| **Should** | 4 | Important but shippable without |
| **Could** | 1 | Nice-to-have, deferred to future |
| **Total** | 17 | All documented requirements |

---

## Requirement Traceability

| Req ID | Linked Spec | Verification Method | Status |
|--------|-------------|--------------------|--------|
| FR-001 | JOB-SPEC-001 | API test: POST /v1/jobs → 201 | ✅ |
| FR-002 | JOB-SPEC-001 | API test: GET /v1/jobs/:id/status | ✅ |
| FR-003 | PROV-SPEC-001 | Integration: provider login/verify | ✅ |
| FR-004 | TOOL-SPEC-001 | Unit: all 5 tools execute correctly | ✅ |
| FR-005 | POLICY-SPEC-001 | UI test: approval dialog appears | ✅ |
| FR-008 | JOB-SPEC-001 | API test: GET /v1/jobs/:id/logs | ✅ |
| FR-009 | PROV-SPEC-001 | API test: GET /v1/providers | ✅ |
| FR-010 | API-SPEC-001 | API test: GET/PUT /v1/profile | ✅ |
| FR-012 | API-SPEC-001 | API test: GET /health | ✅ |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |