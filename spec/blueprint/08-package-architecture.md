# WTAgent Master Blueprint — Package Architecture

## Document: 08-package-architecture.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Package Architecture Overview

WTAgent uses a pnpm workspace monorepo with 23+ packages. This document defines package responsibilities, dependencies, public APIs, and import rules to maintain clean architecture.

---

## Package Taxonomy

### Core Infrastructure Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@wtagent/types` | Shared TypeScript types | `JobRecord`, `ProviderState`, `ToolResult`, `SandboxMode`, etc. | typescript |
| `@wtagent/shared` | Shared utilities | `fetchJson`, `UsageLimit`, `WTAgentError`, `atomicWrite` | zod |
| `@wtagent/platform` | OS abstraction | `getAppDataDir`, `getProjectRoot`, `getChromePath`, `WindowsDiagnostics` | typescript |
| `@wtagent/errors` | Error types (NEW) | `ValidationError`, `NotFoundError`, `ConflictError`, `WTAgentError` | typescript |

### Execution & Tool Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@wtagent/tools` | Tool implementations | `ToolRegistry`, `fs.read`, `fs.write`, `fs.edit`, `fs.search`, `terminal.exec` | zod, @wtagent/types, @wtagent/policy |
| `@wtagent/job` | Job queue & execution | `JobService`, `createJobService`, `JobWorker` | @wtagent/types, @wtagent/shared, @wtagent/browser, @wtagent/runtime |
| `@wtagent/browser` | Browser automation | `WebAdapter`, `ProviderRegistry`, `launchNativeLoginBrowser`, `PROVIDERS` | playwright-core, @wtagent/types, @wtagent/protocol |
| `@wtagent/policy` | Security policy engine | `PolicyEngine`, `ApprovalManager`, `AuditLogger`, `PathGuard` | @wtagent/types, @wtagent/shared |

### Runtime & Session Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@wtagent/runtime` | Agent runtime orchestration | `AgentRuntime`, `executeTask` | @wtagent/types, @wtagent/tools, @wtagent/session |
| `@wtagent/session` | Session management | `SessionManager`, `Session`, `Turn`, `Artifact` | @wtagent/types, @wtagent/shared |
| `@wtagent/protocol` | Agent-provider communication | `Envelope`, `Marker`, `PromptBuilder`, `XMLProtocol` | @wtagent/types |

### Data & Storage Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@wtagent/database` | PGlite persistence | `WTagentDatabase`, `JobRepository`, `ProviderRepository` | @electric-sql/pglite, @wtagent/types |
| `@wtagent/artifacts` | Generated artifact handling | `ArtifactStore`, `saveArtifact`, `verifyArtifact` | @wtagent/types, @wtagent/shared |

### Media & Specialized Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@wtagent/image` | Image generation providers | `ImageProviderRegistry`, `GeminiImageDriver`, `GrokImageDriver` | @wtagent/types, @wtagent/browser |
| `@wtagent/audio` | Music generation | `MusicService`, `GeminiMusicDriver` | @wtagent/types, @wtagent/browser |
| `@wtagent/mcp` | Model Context Protocol server | `MCPServer`, `MCPToolAdapter` | @wtagent/types, @wtagent/tools |

### Application & Tool Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@wtagent/cli` | Command-line interface | `CLI`, `parseArgs`, `runInteractive` | @wtagent/types, @wtagent/runtime, @wtagent/session |
| `@wtagent/plugins` | Plugin system | `PluginRegistry`, `PluginManager` | @wtagent/types, @wtagent/shared |
| `@wtagent/sdk` | External integration SDK | `BrowserAdapter`, `JobRequest` | @wtagent/types, @wtagent/browser |
| `@wtagent/config-api` | Configuration API | `ConfigLoader`, `validateConfig` | @wtagent/types, @wtagent/shared |
| `@wtagent/ws-server` | WebSocket server | `WSServer`, `WSClient` | @wtagent/types, @wtagent/shared |
| `@wtagent/tests` | Test utilities | `testUtils`, `mockProviders`, `setupTestEnv` | vitest, @wtagent/types |
| `@wtagent/local` | Local utilities | `localUtils` | @wtagent/types, @wtagent/shared |

---

## Dependency Graph

```
@wtagent/web ────────────────────────────┐
                                          │
@wtagent/cli ────────────────────────────┤
                                          │
@wtagent/api ────────────────────────────┼─► @wtagent/job
                                          │     │
                                          │     ├─► @wtagent/browser
                                          │     │     │
                                          │     ├─► @wtagent/runtime
                                          │     │     │
                                          │     ├─► @wtagent/tools
                                          │     │     │
                                          │     └─► @wtagent/policy
                                          │           │
                                          │           └─► @wtagent/types
                                          │           └─► @wtagent/shared
                                          │
@wtagent/database ────────────────────────┘
```

---

## Import Rules

### Allowed Imports

| Package | Can Import |
|---------|------------|
| `@wtagent/types` | None (leaf package) |
| `@wtagent/shared` | `@wtagent/types` |
| `@wtagent/platform` | `@wtagent/types` |
| `@wtagent/errors` | `@wtagent/types` |
| `@wtagent/protocol` | `@wtagent/types` |
| `@wtagent/tools` | `@wtagent/types`, `@wtagent/shared`, `@wtagent/policy`, `@wtagent/platform` |
| `@wtagent/policy` | `@wtagent/types`, `@wtagent/shared`, `@wtagent/platform` |
| `@wtagent/database` | `@wtagent/types`, `@wtagent/shared` |
| `@wtagent/browser` | `@wtagent/types`, `@wtagent/shared`, `@wtagent/platform`, `@wtagent/protocol` |
| `@wtagent/job` | `@wtagent/types`, `@wtagent/shared`, `@wtagent/browser`, `@wtagent/runtime`, `@wtagent/policy`, `@wtagent/tools`, `@wtagent/platform` |
| `@wtagent/runtime` | `@wtagent/types`, `@wtagent/tools`, `@wtagent/session`, `@wtagent/protocol` |
| `@wtagent/session` | `@wtagent/types`, `@wtagent/shared` |
| `@wtagent/image` | `@wtagent/types`, `@wtagent/browser`, `@wtagent/shared` |
| `@wtagent/audio` | `@wtagent/types`, `@wtagent/browser`, `@wtagent/shared` |
| `@wtagent/cli` | `@wtagent/types`, `@wtagent/runtime`, `@wtagent/session`, `@wtagent/shared` |
| `@wtagent/api` | `@wtagent/job`, `@wtagent/database`, `@wtagent/browser`, `@wtagent/policy`, `@wtagent/platform` |
| `@wtagent/web` | None (frontend only, imports via HTTP) |

### Prohibited Imports

| Violation | Reason |
|-----------|--------|
| Circular dependencies | Build failure, runtime errors |
| App → Package internal | Breaks encapsulation |
| Package → App | Wrong direction |
| Cross-package internal | Breaks module boundaries |

---

## Public API Guidelines

### Export Rules

1. **Named exports only**: No default exports (consistency)
2. **Type exports**: Always export TypeScript types
3. **JSDoc**: All public functions documented
4. **Stability**: Public API changes require major version bump

### Example: `@wtagent/types`

```typescript
// src/index.ts
export * from './job';
export * from './provider';
export * from './tool';
export * from './session';
export * from './envelope';

// src/job.ts
export interface JobRecord {
  jobId: string;
  task: string;
  status: JobStatus;
  // ...
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
```

### Example: `@wtagent/tools`

```typescript
// src/index.ts
export { ToolRegistry, createToolRegistry } from './registry';
export { fsRead, fsWrite, fsEdit, fsSearch } from './fs';
export { terminalExec } from './terminal-exec';
export type { Tool, ToolContext, ToolResult } from './types';

// src/fs/read.ts
export async function fsRead(params: FsReadParams, context: ToolContext): Promise<ToolResult<FsReadResult>> {
  // Implementation
}
```

---

## Package Versioning

| Package | Version | Strategy |
|---------|---------|----------|
| `@wtagent/types` | 1.0.3 | Semantic (breaking = major) |
| `@wtagent/shared` | 1.0.3 | Semantic |
| `@wtagent/job` | 1.0.3 | Semantic |
| `@wtagent/browser` | 1.0.3 | Semantic |
| `@wtagent/tools` | 1.0.3 | Semantic |
| `@wtagent/policy` | 1.0.3 | Semantic |
| `@wtagent/database` | 1.0.0 | Semantic |
| All others | 1.0.3 | Synchronized |

**Version Sync**: All packages use same major.minor for simplicity (pnpm workspace).

---

## Build Configuration

### TypeScript Project References

```json
// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "packages/types" },
    { "path": "packages/shared" },
    { "path": "packages/platform" },
    { "path": "packages/errors" },
    { "path": "packages/protocol" },
    { "path": "packages/policy" },
    { "path": "packages/tools" },
    { "path": "packages/database" },
    { "path": "packages/browser" },
    { "path": "packages/session" },
    { "path": "packages/runtime" },
    { "path": "packages/job" },
    { "path": "packages/artifacts" },
    { "path": "packages/image" },
    { "path": "packages/audio" },
    { "path": "packages/mcp" },
    { "path": "packages/cli" },
    { "path": "packages/plugins" },
    { "path": "packages/sdk" },
    { "path": "packages/config-api" },
    { "path": "packages/ws-server" },
    { "path": "packages/tests" },
    { "path": "packages/local" },
    { "path": "apps/api" },
    { "path": "apps/web" }
  ]
}
```

### Build Order

1. `@wtagent/types` (no deps)
2. `@wtagent/shared`, `@wtagent/platform`, `@wtagent/errors`, `@wtagent/protocol` (deps: types)
3. `@wtagent/policy`, `@wtagent/tools`, `@wtagent/database`, `@wtagent/session` (deps: shared/types)
4. `@wtagent/browser`, `@wtagent/runtime`, `@wtagent/artifacts` (deps: policy/tools/protocol)
5. `@wtagent/job`, `@wtagent/image`, `@wtagent/audio` (deps: browser/runtime)
6. `@wtagent/mcp`, `@wtagent/cli`, `@wtagent/plugins`, `@wtagent/sdk` (deps: job/tools)
7. `@wtagent/api`, `@wtagent/web` (apps, deps: all)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |