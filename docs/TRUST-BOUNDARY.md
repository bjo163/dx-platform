# Trust Boundary: Local Runtime & Cloud Provider

## Purpose

This document defines the trust boundary between the local Rocksoul DX runtime and external cloud providers. It ensures that data outbound from the local environment is explicit, auditable, and respects user privacy preferences.

## Core Principles

### 1. Local-First by Default

- The local runtime **must not** silently route requests to cloud providers
- Any request marked `local-only` must remain on-premises unless an explicit policy change is made
- Provider selection is always opt-in, never implicit

### 2. Explicit Data Outbound

| Direction | Description | Policy |
|---|---|---|
| **Local → Cloud** | Intentional model/provider calls | Requires valid credential, explicit policy, user consent |
| **Local → Local** | Offline/in-process execution | Preferred; no network, no secrets leaked |
| **Cloud → Local** | Model responses, artifacts | Must be redacted of prompt content, secrets, before storage |

### 3. Privacy-Honest Flow

- **Never** send credentials, prompt content, or session data to cloud providers without explicit user authorization
- **Always** redact before persisting any cloud-sourced data
- **Audit** every outbound request with correlation ID and timestamp

### 4. Least Privilege Access

- Network egress is scoped to approved provider endpoints only
- Credentials are injected via environment variables, never hardcoded
- Browser sessions and profiles are isolated per-mission

## Trust Boundary Zones

### Zone A: Fully Local (No Outbound)

- Model execution with local/OSS providers (Ollama, LM Studio, etc.)
- Offline task planning and dependency resolution
- File system operations within workspace
- **Data never leaves the machine**

### Zone B: Controlled Outbound (Explicit Policy)

- Model calls to approved API providers (OpenAI, Anthropic, etc.)
- Requires: valid API key, `local-only: false` policy flag, user consent
- **Data outbound is logged and auditable**

### Zone C: Forbidden Outbound

- Any request that would expose prompt content, secrets, or user data to unauthorized endpoints
- Automatically blocked by policy engine
- Triggers security audit event

## Policy Enforcement

### 1. Policy Engine Checks

Every outbound request passes through the policy engine which verifies:

```typescript
// Pseudocode - policy check flow
if (request.localOnly && !userHasOverride) {
  block("local-only policy violation");
}
if (!request.hasValidCredential(provider)) {
  block("missing or invalid provider credential");
}
if (request.promptContentIncludesSensitiveData) {
  redact("sensitive data detected in prompt");
}
```

### 2. User Override

Users can explicitly opt-in to cloud provider usage through:
- Mission-level policy configuration
- Per-task `local-only` flag override
- Provider whitelist/blacklist settings

### 3. Audit & Logging

All outbound requests generate an audit event with:
- `correlationId` (task-scoped)
- `provider` and `model` used
- `direction` (local→cloud or cloud→local)
- `dataClass` (prompt, response, metadata, secrets)
- ` consentStatus` (granted, denied, implicit)
- `timestamp` and `duration`

## Implementation Guidelines

### For Runtime Developers

1. **Never assume cloud availability** - design for offline-first
2. **Redact before log** - strip prompt/content from any audit logs
3. **Use correlation IDs** - trace every request through the system
4. **Default to local** - if no explicit policy, assume local-only

### For Mission Authors

1. **Declare provider requirements** in mission metadata
2. **Set `local-only: true`** by default for privacy-sensitive tasks
3. **Provide explicit opt-in** for any cloud provider usage
4. **Document data handling** in mission acceptance criteria

### For Users

1. **Review policy before running** missions that involve cloud providers
2. **Manage API credentials** through the settings panel
3. **Check audit logs** to verify what data was sent outbound
4. **Use local models** when possible for privacy-sensitive work

## Examples

### Local-Only Mission (No Cloud)

```yaml
# mission metadata
goal: "Analyze codebase for security issues"
local_only: true
providers: []  # empty = local only
```

### Cloud-Enabled Mission (Explicit)

```yaml
# mission metadata
goal: "Generate code suggestions using GPT-4"
local_only: false
providers:
  - name: "openai"
    model: "gpt-4o"
    credential_id: "user-openai-key"
```

### Mixed Mission (Some Steps Local, Some Cloud)

```yaml
# mission metadata
goal: "Develop feature with AI assistance"
local_only: "auto"  # auto: local first, cloud if needed
steps:
  - name: "code analysis"
    local_only: true
  - name: "code generation"
    local_only: false
```

## Revision History

| Date | Change | Author |
|---|---|---|
| 2026-11-05 | Initial draft | auto-generated |

## Related Documents

- [README.md](README.md) - Project overview and principles
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [packages/security/](packages/security/) - Security implementation
- [blueprint.md](blueprint.md) - Product blueprint