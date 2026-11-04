# WTAgent Master Blueprint — Domain Architecture

## Document: 07-domain-architecture.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Domain Architecture Overview

WTAgent applies Domain-Driven Design (DDD) principles to identify core domains, bounded contexts, and their relationships. This ensures clear ownership, reduces coupling, and enables independent evolution.

---

## Core Domains

### 1. Job Execution Domain
**Bounded Context**: `@wtagent/job` + `@wtagent/runtime`

| Concept | Type | Description |
|---------|------|-------------|
| Job | Aggregate Root | Lifecycle: pending → running → completed/failed/cancelled |
| JobId | Value Object | UUID v4, immutable identifier |
| Task | Value Object | User instruction (string, 1-10000 chars) |
| Status | Enum | pending, running, completed, failed, cancelled |
| ProviderRef | Value Object | Provider ID + version |
| AllowedTools | Value Object | Tool name array, validated against registry |
| JobEvent | Domain Event | StatusChange, LogEntry, ApprovalRequest, Completion |
| JobLog | Entity | stdout, stderr, transcript (immutable after completion) |

**Domain Rules**:
- Job can only transition forward in lifecycle
- Cancellation only from running state
- Retry creates new Job with same Task
- Max 3 retries before dead letter

**Domain Services**:
- `JobQueue`: FIFO ordering, priority support (future)
- `JobWorker`: Executes job via Runtime
- `JobStore`: Persistence + WAL sync

---

### 2. Provider Integration Domain
**Bounded Context**: `@wtagent/browser`

| Concept | Type | Description |
|---------|------|-------------|
| Provider | Aggregate Root | Identity, capabilities, status, auth state |
| ProviderId | Value Object | String identifier (chatgpt, gemini, etc.) |
| Profile | Entity | Chrome profile directory + metadata |
| Session | Entity | CDP connection + auth state |
| Adapter | Domain Service | Provider-specific DOM interaction |
| Selector | Value Object | CSS/XPath selector with fallback chain |
| AuthState | Enum | authenticated, unauthenticated, unknown |

**Domain Rules**:
- One active profile per provider per machine
- Profile persists across restarts
- Session validated before job execution
- Session expires after 30 min inactivity

**Domain Services**:
- `ProviderRegistry`: Register/find providers
- `ProfileManager`: Create/delete/validate profiles
- `BrowserPool`: CDP connection lifecycle
- `SelectorManager`: Fallback selector resolution

---

### 3. Tool Execution Domain
**Bounded Context**: `@wtagent/tools`

| Concept | Type | Description |
|---------|------|-------------|
| Tool | Aggregate Root | Name, description, schema, sandbox level |
| ToolName | Value Object | String (fs.read, fs.write, etc.) |
| ToolSchema | Value Object | Zod schema for parameter validation |
| SandboxMode | Enum | workspace-read, workspace-write, danger-full-access |
| ToolResult | Value Object | Success/data or error/code |
| PathGuard | Domain Service | Validates path within workspace |
| CommandGuard | Domain Service | Validates command against allow/block list |

**Domain Rules**:
- All tools require sandbox mode check
- fs.write/fs.edit require approval for existing files
- terminal.exec requires approval for non-allowlisted commands
- Max file size: 10MB
- Max terminal output: 10MB

**Domain Services**:
- `ToolRegistry`: Register/execute tools
- `PathGuard`: Path resolution + boundary check
- `CommandGuard`: Allow/block list validation

---

### 4. Policy & Security Domain
**Bounded Context**: `@wtagent/policy`

| Concept | Type | Description |
|---------|------|-------------|
| PolicyRule | Entity | ID, tool, condition, action, priority |
| ApprovalRecord | Entity | ID, tool, params, decision, timestamp |
| SandboxMode | Enum | workspace-read, workspace-write, danger-full-access |
| ApprovalDecision | Enum | allow, deny |
| AuditEntry | Value Object | Timestamp, tool, action, decision, user |
| PathGuard | Domain Service | Path boundary enforcement |

**Domain Rules**:
- Rules evaluated in priority order (highest first)
- Default deny if no rule matches
- Approval decisions cached for 30s
- Audit log: append-only, 7-day retention

**Domain Services**:
- `PolicyEngine`: Rule evaluation + decision
- `ApprovalManager`: User interaction + storage
- `AuditLogger`: JSONL logging

---

### 5. Data Persistence Domain
**Bounded Context**: `@wtagent/database`

| Concept | Type | Description |
|---------|------|-------------|
| Database | Aggregate Root | PGlite connection + schema |
| JobRecord | Entity | All job fields + JSON payload |
| ProviderState | Entity | Configured, authenticated, lastVerifiedAt |
| PluginConfig | Entity | Enabled, config JSON |
| Profile | Entity | Display name, initials |
| Migration | Entity | Version, appliedAt, checksum |

**Domain Rules**:
- WAL enabled for durability
- Single writer (serialized access)
- Schema versioned (migrations)
- Backup on schema change

**Domain Services**:
- `WTagentDatabase`: Connection + CRUD
- `MigrationRunner`: Apply/verify migrations

---

### 6. Session Management Domain
**Bounded Context**: `@wtagent/session`

| Concept | Type | Description |
|---------|------|-------------|
| Session | Aggregate Root | ID, transcript, metadata, createdAt |
| Turn | Entity | Role (user/agent), content, toolCalls, artifacts |
| Artifact | Entity | Type (file, image, music), path, hash, metadata |
| Transcript | Value Object | Turn array (immutable once added) |
| SessionId | Value Object | UUID v4 |

**Domain Rules**:
- Sessions persist across restarts
- Transcript append-only (immutable history)
- Artifacts referenced by content hash
- Max session size: 100MB

**Domain Services**:
- `SessionManager`: Create/load/save sessions
- `ArtifactStore`: Save/verify/load artifacts

---

## Domain Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    Domain Interaction Map                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐         ┌──────────────────┐                │
│   │   Job        │         │  Provider        │                │
│   │  Execution   │────────►│  Integration     │                │
│   │   Domain     │         │   Domain         │                │
│   └──────────────┘         └──────────────────┘                │
│        │                            │                           │
│        │ uses                        │ provides                 │
│        ▼                            ▼                           │
│   ┌──────────────┐         ┌──────────────────┐                │
│   │    Tool      │         │    Browser       │                │
│   │  Execution   │         │     Pool         │                │
│   │   Domain     │         │   (Sub-domain)   │                │
│   └──────────────┘         └──────────────────┘                │
│        │                            │                           │
│        │ guarded by                 │                           │
│        ▼                            ▼                           │
│   ┌──────────────┐         ┌──────────────────┐                │
│   │   Policy &   │         │    Session       │                │
│   │  Security    │         │  Management      │                │
│   │   Domain     │         │   Domain         │                │
│   └──────────────┘         └──────────────────┘                │
│        │                            │                           │
│        │ audited by                 │ persists                  │
│        ▼                            ▼                           │
│   ┌──────────────────────────────────────────┐                 │
│   │          Data Persistence Domain          │                 │
│   │             (Database)                    │                 │
│   └──────────────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Domain Events

| Event | Publisher | Consumers | Payload |
|-------|-----------|-----------|---------|
| `JobCreated` | Job Service | SSE, Database | jobId, task, provider |
| `JobStatusChanged` | Job Service | SSE, Database | jobId, oldStatus, newStatus |
| `JobCompleted` | Job Service | SSE, Database, Session | jobId, result |
| `JobFailed` | Job Service | SSE, Database | jobId, error |
| `JobCancelled` | Job Service | SSE, Database | jobId |
| `ProviderConnected` | Browser Pool | Database, UI | providerId, profileDir |
| `ProviderDisconnected` | Browser Pool | Database, UI | providerId |
| `ApprovalRequested` | Policy Engine | UI (via SSE) | approvalId, tool, params |
| `ApprovalDecided` | Policy Engine | Job Service | approvalId, decision |
| `ToolExecuted` | Tool Registry | Audit Logger | tool, params, decision |
| `ArtifactCreated` | Session Manager | Database, UI | sessionId, artifact |

---

## Anti-Corruption Layers

| Boundary | ACL Purpose | Implementation |
|----------|-------------|----------------|
| Provider Web UI → Provider Domain | Map DOM to domain model | Adapter pattern per provider |
| API HTTP → Job Domain | Transform HTTP to commands | Fastify routes → JobService methods |
| User Workspace → Tool Domain | Path resolution + guard | PathGuard service |
| Terminal → Tool Domain | Command validation | CommandGuard service |
| PGlite → Database Domain | SQL to domain entities | Repository pattern |

---

## Ubiquitous Language

| Term | Definition |
|------|------------|
| **Job** | Unit of work submitted by user, executed by agent |
| **Task** | Natural language instruction from user |
| **Provider** | Web AI service (ChatGPT, Gemini, etc.) |
| **Profile** | Isolated Chrome user data directory |
| **Session** | Authenticated browser connection |
| **Adapter** | Provider-specific DOM automation |
| **Tool** | Capability exposed to agent (fs, terminal) |
| **Sandbox** | Execution boundary (read/write/danger) |
| **Approval** | User consent for dangerous operation |
| **Artifact** | Generated output (file, image, music) |
| **Transcript** | Immutable conversation history |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |