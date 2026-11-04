# NeuralForge Master Blueprint — Package Architecture

## Document: 08-package-architecture.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Package Architecture Overview

NeuralForge uses a pnpm workspace monorepo with 23+ packages. This document defines package responsibilities, dependencies, public APIs, and import rules to maintain clean architecture.

---

## Package Taxonomy

### Core Infrastructure Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@neuralforge/types` | Shared TypeScript types | `JobRecord`, `ProviderState`, `ToolResult`, `SandboxMode`, etc. | typescript |
| `@neuralforge/shared` | Shared utilities | `fetchJson`, `UsageLimit`, `NeuralForgeError`, `atomicWrite` | zod |
| `@neuralforge/platform` | OS abstraction | `getAppDataDir`, `getProjectRoot`, `getChromePath`, `WindowsDiagnostics` | typescript |
| `@neuralforge/errors` | Error types (NEW) | `ValidationError`, `NotFoundError`, `ConflictError`, `NeuralForgeError` | typescript |

### Execution & Tool Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@neuralforge/tools` | Tool implementations | `ToolRegistry`, `fs.read`, `fs.write`, `fs.edit`, `fs.search`, `terminal.exec` | zod, @neuralforge/types, @neuralforge/policy |
| `@neuralforge/job` | Job queue & execution | `JobService`, `createJobService`, `JobWorker` | @neuralforge/types, @neuralforge/shared, @neuralforge/browser, @neuralforge/runtime |
| `@neuralforge/browser` | Browser automation | `WebAdapter`, `ProviderRegistry`, `launchNativeLoginBrowser`, `PROVIDERS` | playwright-core, @neuralforge/types, @neuralforge/protocol |
| `@neuralforge/policy` | Security policy engine | `PolicyEngine`, `ApprovalManager`, `AuditLogger`, `PathGuard` | @neuralforge/types, @neuralforge/shared |

### Runtime & Session Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@neuralforge/runtime` | Agent runtime orchestration | `AgentRuntime`, `executeTask` | @neuralforge/types, @neuralforge/tools, @neuralforge/session |
| `@neuralforge/session` | Session management | `SessionManager`, `Session`, `Turn`, `Artifact` | @neuralforge/types, @neuralforge/shared |
| `@neuralforge/protocol` | Agent-provider communication | `Envelope`, `Marker`, `PromptBuilder`, `XMLProtocol` | @neuralforge/types |

### Data & Storage Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@neuralforge/database` | PGlite persistence | `WTagentDatabase`, `JobRepository`, `ProviderRepository` | @electric-sql/pglite, @neuralforge/types |
| `@neuralforge/artifacts` | Generated artifact handling | `ArtifactStore`, `saveArtifact`, `verifyArtifact` | @neuralforge/types, @neuralforge/shared |

### Media & Specialized Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@neuralforge/image` | Image generation providers | `ImageProviderRegistry`, `GeminiImageDriver`, `GrokImageDriver` | @neuralforge/types, @neuralforge/browser |
| `@neuralforge/audio` | Music generation | `MusicService`, `GeminiMusicDriver` | @neuralforge/types, @neuralforge/browser |
| `@neuralforge/mcp` | Model Context Protocol server | `MCPServer`, `MCPToolAdapter` | @neuralforge/types, @neuralforge/tools |

### Application & Tool Packages

| Package | Responsibility | Exports | Dependencies |
|---------|---------------|---------|--------------|
| `@neuralforge/cli` | Command-line interface | `CLI`, `parseArgs`, `runInteractive` | @neuralforge/types, @neuralforge/runtime, @neuralforge/session |
| `@neuralforge/plugins` | Plugin system | `PluginRegistry`, `PluginManager` | @neuralforge/types, @neuralforge/shared |
| `@neuralforge/sdk` | External integration SDK | `BrowserAdapter`, `JobRequest` | @neuralforge/types, @neuralforge/browser |
| `@neuralforge/config-api` | Configuration API | `ConfigLoader`, `validateConfig` | @neuralforge/types, @neuralforge/shared |
| `@neuralforge/ws-server` | WebSocket server | `WSServer`, `WSClient` | @neuralforge/types, @neuralforge/shared |
| `@neuralforge/tests` | Test utilities | `testUtils`, `mockProviders`, `setupTestEnv` | vitest, @neuralforge/types |
| `@neuralforge/local` | Local utilities | `localUtils` | @neuralforge/types, @neuralforge/shared |

---

## Dependency Graph

```
@neuralforge/web ────────────────────────────┐
                                          │
@neuralforge/cli ────────────────────────────┤
                                          │
@neuralforge/api ────────────────────────────┼─► @neuralforge/job
                                          │     │
                                          │     ├─► @neuralforge/browser
                                          │     │     │
                                          │     ├─► @neuralforge/runtime
                                          │     │     │
                                          │     ├─► @neuralforge/tools
                                          │     │     │
                                          │     └─► @neuralforge/policy
                                          │           │
                                          │           └─► @neuralforge/types
                                          │           └─► @neuralforge/shared
                                          │
@neuralforge/database ────────────────────────┘
```

---

## Import Rules

### Allowed Imports

| Package | Can Import |
|---------|------------|
| `@neuralforge/types` | None (leaf package) |
| `@neuralforge/shared` | `@neuralforge/types` |
| `@neuralforge/platform` | `@neuralforge/types` |
| `@neuralforge/errors` | `@neuralforge/types` |
| `@neuralforge/protocol` | `@neuralforge/types` |
| `@neuralforge/tools` | `@neuralforge/types`, `@neuralforge/shared`, `@neuralforge/policy`, `@neuralforge/platform` |
| `@neuralforge/policy` | `@neuralforge/types`, `@neuralforge/shared`, `@neuralforge/platform` |
| `@neuralforge/database` | `@neuralforge/types`, `@neuralforge/shared` |
| `@neuralforge/browser` | `@neuralforge/types`, `@neuralforge/shared`, `@neuralforge/platform`, `@neuralforge/protocol` |
| `@neuralforge/job` | `@neuralforge/types`, `@neuralforge/shared`, `@neuralforge/browser`, `@neuralforge/runtime`, `@neuralforge/policy`, `@neuralforge/tools`, `@neuralforge/platform` |
| `@neuralforge/runtime` | `@neuralforge/types`, `@neuralforge/tools`, `@neuralforge/session`, `@neuralforge/protocol` |
| `@neuralforge/session` | `@neuralforge/types`, `@neuralforge/shared` |
| `@neuralforge/image` | `@neuralforge/types`, `@neuralforge/browser`, `@neuralforge/shared` |
| `@neuralforge/audio` | `@neuralforge/types`, `@neuralforge/browser`, `@neuralforge/shared` |
| `@neuralforge/cli` | `@neuralforge/types`, `@neuralforge/runtime`, `@neuralforge/session`, `@neuralforge/shared` |
| `@neuralforge/api` | `@neuralforge/job`, `@neuralforge/database`, `@neuralforge/browser`, `@neuralforge/policy`, `@neuralforge/platform` |
| `@neuralforge/web` | None (frontend only, imports via HTTP) |

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

### Example: `@neuralforge/types`

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

### Example: `@neuralforge/tools`

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
| `@neuralforge/types` | 1.0.3 | Semantic (breaking = major) |
| `@neuralforge/shared` | 1.0.3 | Semantic |
| `@neuralforge/job` | 1.0.3 | Semantic |
| `@neuralforge/browser` | 1.0.3 | Semantic |
| `@neuralforge/tools` | 1.0.3 | Semantic |
| `@neuralforge/policy` | 1.0.3 | Semantic |
| `@neuralforge/database` | 1.0.0 | Semantic |
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

1. `@neuralforge/types` (no deps)
2. `@neuralforge/shared`, `@neuralforge/platform`, `@neuralforge/errors`, `@neuralforge/protocol` (deps: types)
3. `@neuralforge/policy`, `@neuralforge/tools`, `@neuralforge/database`, `@neuralforge/session` (deps: shared/types)
4. `@neuralforge/browser`, `@neuralforge/runtime`, `@neuralforge/artifacts` (deps: policy/tools/protocol)
5. `@neuralforge/job`, `@neuralforge/image`, `@neuralforge/audio` (deps: browser/runtime)
6. `@neuralforge/mcp`, `@neuralforge/cli`, `@neuralforge/plugins`, `@neuralforge/sdk` (deps: job/tools)
7. `@neuralforge/api`, `@neuralforge/web` (apps, deps: all)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |