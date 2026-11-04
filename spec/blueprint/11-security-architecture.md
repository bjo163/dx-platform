# WTAgent Master Blueprint — Security Architecture

## Document: 11-security-architecture.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Security Architecture Overview

WTAgent implements a defense-in-depth security model with trust boundaries, sandbox enforcement, approval workflows, and audit logging. This document defines the security model, threat landscape, and controls.

---

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trust Boundary Diagram                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐   UNTRUSTED (External)    ┌─────────────────┐ │
│  │   Web AI        │ ──────────────────────►   │   WTAgent Core  │ │
│  │   Providers     │  (ChatGPT, Gemini, etc.)  │  (API Server)   │ │
│  │   (CDP)         │                            │               │ │
│  └─────────────────┘                            └─────────────────┘ │
│           │                                              │         │
│           │ HTTP/CDP                                     │         │
│           ▼                                              ▼         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Policy Engine                         │   │
│  │  (Sandbox enforcement, Approval workflow)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                                              │         │
│           ▼                                              ▼         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Job Execution Layer                         │   │
│  │  (Browser Pool, Tools, Job Workers)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                                              │         │
│           ▼                                              ▼         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              User Workspace (FILESYSTEM)                 │   │
│  │  (Read/write within sandbox, terminal commands)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Layers

### 1. Network Layer
- **CORS**: Configurable origins, no wildcard
- **Rate Limiting**: Per-IP, per-endpoint limits
- **Bind Address**: `127.0.0.1` only (no external exposure)
- **Headers**: Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

### 2. Application Layer
- **Input Validation**: Zod schemas on all inputs
- **Error Handling**: No stack traces in production
- **Authentication**: Optional JWT (future), no auth currently (local-first)
- **Session Management**: Browser session isolation

### 3. Sandbox Layer
- **Sandbox Modes**: workspace-read, workspace-write, danger-full-access
- **Path Guarding**: Realpath validation, symlink protection
- **Command Guarding**: Allowlist/blocklist validation

### 4. Policy Layer
- **Approval Workflow**: User consent for dangerous operations
- **Audit Logging**: JSONL format, 7-day retention
- **Rule Engine**: YAML/JSON policy rules

### 5. OS Layer
- **User Permissions**: Non-root user
- **File Permissions**: 0600 for sensitive files
- **Process Isolation**: Separate Chrome processes per provider

---

## Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| **Path Traversal** | Critical | PathGuard realpath validation |
| **Command Injection** | Critical | Argument array, no shell=True |
| **DOM Injection** | High | Selector validation, DOM sanitization |
| **Browser Escape** | Critical | Chrome sandbox (default), profile isolation |
| **Data Exfiltration** | High | Network disabled in danger mode (future) |
| **Approval Bypass** | Medium | Context-aware evaluation, nonce tokens |
| **Audit Log Tampering** | Medium | Append-only JSONL, log rotation |
| **Profile Theft** | High | Isolated profiles, no credential storage |
| **Cross-Provider Leakage** | Low | Isolated Chrome processes |
| **Denial of Service** | Medium | Rate limiting, job timeouts |

---

## Sandbox Modes

| Mode | File Operations | Terminal Operations | Approval Required | Use Case |
|------|----------------|---------------------|-------------------|----------|
| `workspace-read` | Read only (within workspace) | None | No | Code inspection, analysis |
| `workspace-write` | Read + write (within workspace) | None | No | Code changes, file creation |
| `danger-full-access` | Full filesystem | Full terminal | Selective | Build commands, test execution |

### Sandbox Enforcement

```typescript
function validatePath(path: string, projectRoot: string, mode: SandboxMode): string {
  const resolved = path.resolve(projectRoot, path);
  const root = path.resolve(projectRoot);
  
  if (mode === 'danger-full-access') return resolved;
  
  if (!resolved.startsWith(root)) {
    throw new Error(`Path outside workspace: ${path}`);
  }
  
  const real = path.realpathSync(resolved);
  if (!real.startsWith(root)) {
    throw new Error(`Symlink escape: ${path}`);
  }
  
  return real;
}
```

---

## Approval Workflow

### Approval Matrix

| Tool | Parameter | Approval Required? | Reason |
|------|-----------|-------------------|--------|
| `fs.read` | Any | No | Read-only within sandbox |
| `fs.search` | Any | No | Read-only within sandbox |
| `fs.write` | New file | No | Create within sandbox |
| `fs.write` | Existing file | **Yes** | Overwrite risk |
| `fs.edit` | Any | **Yes** | Mutation risk |
| `terminal.exec` | Allowlisted | No | Safe commands |
| `terminal.exec` | Blocklisted | **Yes** | Dangerous commands |
| `terminal.exec` | Unknown | **Yes** | Unknown command |

### Approval Dialog

```text
┌─────────────────────────────────────────────────────────────┐
│                    APPROVAL REQUIRED                        │
├─────────────────────────────────────────────────────────────┤
│ Tool: fs.edit                                               │
│ Path: /project/src/index.ts                                 │
│ Action: Overwrite existing file                             │
│ Risk: Data loss possible                                    │
│                                                             │
│ Parameters:                                                 │
│   oldString: "const x = 1;"                                 │
│   newString: "const x = 2;"                                 │
│   replaceAll: false                                         │
│                                                             │
│ [ Allow ]    [ Deny ]    [ Remember for this session ]      │
└─────────────────────────────────────────────────────────────┘
```

### Approval Storage

```typescript
interface ApprovalRecord {
  id: string;                  // UUID
  tool: string;                // Tool name
  parameters: Record<string, unknown>;
  decision: 'allow' | 'deny';
  decidedAt: string;           // ISO 8601
  decidedBy: string;           // User ID
  reason?: string;
  context: {
    projectRoot: string;
    sandboxMode: string;
    timestamp: string;
  };
}
```

---

## Audit Logging

### Format (JSONL)

```jsonl
{"timestamp":"2024-01-15T10:30:00Z","tool":"fs.write","path":"/project/src/index.ts","action":"create","decision":"allow","user":"user"}
{"timestamp":"2024-01-15T10:30:01Z","tool":"terminal.exec","command":"npm test","decision":"allow","user":"user"}
{"timestamp":"2024-01-15T10:30:02Z","tool":"fs.edit","path":"/project/src/index.ts","action":"modify","decision":"deny","user":"user"}
```

### Retention

- **Active**: `.wtagent/data/audit/current.jsonl` (7 days)
- **Rotated**: `.wtagent/data/audit/YYYY-MM-DD.jsonl.gz` (30 days)
- **Purged**: `rm -f` old files

---

## Provider Security

### Browser Isolation
- Isolated Chrome profile per provider
- No cross-profile cookie sharing
- Separate Chrome processes
- Profile directories encrypted at rest (future)

### Session Management
- Profile created on first login
- Session validated via DOM probe before job execution
- Session expired after 30 minutes inactivity
- Browser closed on disconnect

### DOM Probing Security
- Selector validation against allowlist
- Fallback selector strategies
- Version detection for DOM changes

---

## Policy Engine Security

### Rule Evaluation
- Rules evaluated in priority order (highest first)
- Default deny if no rule matches
- Approval decisions cached for 30 seconds
- Rule syntax validation on load

### Rule Format

```yaml
rules:
  - id: fs-write-overwrite
    tool: fs.write
    action: require_approval
    condition: "pathExists"
  - id: terminal-dangerous
    tool: terminal.exec
    action: require_approval
    condition: "commandInBlocklist"
```

---

## Encryption & Data Protection

### Data at Rest
- **Database**: PGlite file (OS permissions 0600)
- **Profile Directories**: OS permissions 0700
- **Audit Logs**: JSONL files (OS permissions 0600)
- **Future**: Encrypted filesystem for sensitive data

### Data in Transit
- **HTTP**: Local only (127.0.0.1)
- **CDP**: Local WebSocket (127.0.0.1)
- **TLS**: Not used (local-only)

### Credentials
- **No credentials stored** in plaintext
- **No API keys** (browser session only)
- **Session cookies** stored in profile directory

---

## Logging & Monitoring

### Audit Logs
- 100% of tool operations logged
- No PII in logs (no credentials, no file content)
- Structured JSONL format
- Rotation and compression

### Security Events
| Event | Trigger | Log Level |
|-------|---------|-----------|
| Path traversal attempt | Blocked | WARN |
| Command injection attempt | Blocked | WARN |
| Approval denied | User denied | INFO |
| Approval granted | User allowed | INFO |
| Provider disconnect | Manual or timeout | INFO |
| Browser crash | Process exit | ERROR |

---

## Compliance & Standards

| Standard | Status | Notes |
|----------|--------|-------|
| OWASP ASVS | Level 1 | Basic controls implemented |
| GDPR | Not applicable | No PII stored |
| SOC 2 | Not applicable | Local-only software |
| ISO 27001 | Not applicable | N/A |
| CIS Benchmarks | Partial | OS-level hardening |

---

## Security Testing

### Penetration Testing
| Test | Tool | Frequency |
|------|------|-----------|
| Path traversal | Custom scripts | Per release |
| Command injection | Custom scripts | Per release |
| DOM injection | Custom scripts | Per release |
| Browser escape | Browser hardening tests | Per release |

### Automated Security Tests
```bash
# Run security tests
pnpm run test:security

# Check dependencies
pnpm audit

# License compliance
pnpm licenses check
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |