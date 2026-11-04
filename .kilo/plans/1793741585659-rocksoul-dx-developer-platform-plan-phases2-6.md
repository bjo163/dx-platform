# rocksoul-dx Developer Platform Plan - Phases 2-6

## Overview

Continue transforming NeuralForge into a **rocksoul-dx Developer Platform** after Phase 1 (SDK Package) is complete. This plan covers Track B phases 2-3 and Track C phases 1-2.

## 🎯 Goal

Complete the developer platform with WebSocket connectivity, configuration API, plugin system, and local model support — enabling IDE integration, CI/CD pipelines, and custom workflows.

---

## 📦 Package Implementation Roadmap

### Phase 2: gRPC / WebSocket Server — *Track B: p.2*

| Package | `@neuralforge/ws-server` |
|---------|----------------------|
| **Purpose** | Bidirectional streaming for real-time agent operations |
| **Key Features** | - VS Code / Cursor / Windsurf integration hooks<br>- Connection lifecycle management<br>- WebSocket upgrade from gateway foundation |
| **Dependencies** | `@neuralforge/types`, `@neuralforge/shared`, `@neuralforge/gateway` |
| **Success Criteria** | Supports bidirectional streaming connections |

**Implementation Plan:**
- Create `packages/ws-server` package following existing patterns
- Extend gateway's Node `http` + WebSocket handling for bidirectional streaming
- Implement connection management, heartbeat, and reconnection logic
- Add integration hooks for IDE clients (VS Code extension, Cursor, Windsurf)

### Phase 3: Configuration REST API — *Track B: p.3*

| Package | `@neuralforge/config-api` |
|---------|----------------------|
| **Purpose** | REST `/v1/config` dynamic runtime switching |
| **Key Features** | - `POST /v1/config` accepting model/provider/temperature<br>- OpenAPI spec for platform consumers<br>- Environment variable + runtime config merging |
| **Dependencies** | `@neuralforge/types`, `@neuralforge/shared`, `@neuralforge/sdk` |
| **Success Criteria** | `POST /v1/config` accepts and returns runtime configuration |

**Implementation Plan:**
- Create `packages/config-api` package
- Implement `POST /v1/config` route with config merging logic
- Define OpenAPI specification for config API
- Merge environment variables with runtime config
- Integrate with `@neuralforge/sdk` for runtime switching

### Phase 4: Plugin System — *Track C: p.1*

| Package | `@neuralforge/plugins` |
|---------|--------------------|
| **Purpose** | Plugin system for community tools |
| **Key Features** | - Manifest-based plugin discovery<br>- GitHub, Jira, DB community tool templates<br>- Sandboxed execution context (future: Docker/gVisor) |
| **Dependencies** | `@neuralforge/types`, `@neuralforge/shared` |
| **Success Criteria** | Manifest format documented and versioned |

**Implementation Plan:**
- Create `packages/plugins` package
- Define manifest format for plugin discovery
- Implement GitHub and Jira integration templates
- Create sandboxed execution context (allowlist-based for now)
- Document plugin API and versioning

### Phase 5: Local Model Support — *Track C: p.2*

| Package | `@neuralforge/local` |
|---------|------------------|
| **Purpose** | Local model support (Ollama, LMStudio) |
| **Key Features** | - Ollama integration<br>- LMStudio integration<br>- Offline/air-gapped mode flag<br>- Model capability detection |
| **Dependencies** | `@neuralforge/types`, `@neuralforge/shared` |
| **Success Criteria** | Local model (Ollama/LMStudio) integration functional |

**Implementation Plan:**
- Create `packages/local` package
- Integrate Ollama and LMStudio as providers
- Add `offline`/air-gapped mode flag
- Implement model capability detection and fallback
- Integrate with `@neuralforge/sdk` for local model routing

### Phase 6: Web App Enhancements — *Track A completion*

| Item | Tahap |
|------|-------|
| DOM-drift resilience | Tahap 2.2 |
| Visible progress indicators | Tahap 2.3 |
| Token/size budget & retry policies | Tahap 2.4 |

**Implementation Plan:**
- Complete DOM-drift resilience improvements
- Add visible progress indicators for agent operations
- Implement token/size budget policies and retry strategies

---

## 📊 Dependencies & Boundaries

### Existing (reuse)
- `@neuralforge/types` — type definitions
- `@neuralforge/shared` — env parsing, path resolution
- `@neuralforge/gateway` — HTTP server foundation
- `@neuralforge/sdk` — importable library (Phase 1)
- `@neuralforge/job` — task orchestration
- `@neuralforge/runtime` — agent execution

### New packages to create
- `packages/ws-server` — gRPC/WebSocket runtime
- `packages/config-api` — REST configuration
- `packages/plugins` — extensibility framework
- `packages/local` — local model support

### Shared dependencies
- All new packages depend on `@neuralforge/types` and `@neuralforge/shared`
- TypeScript `composite: true` + `incremental: true` builds
- `tsc -b` build workflow

---

## ⚠️ Risks & Constraints

| Risk | Mitigation |
|------|-----------|
| WebSocket complexity | Use existing `net`/`ws` foundations from `@neuralforge/gateway` |
| Plugin sandboxing security | Delegate to Docker/gVisor in future; start with allowlist |
| Type compatibility across packages | Enforce `composite: true` and shared `tsconfig.json` |
| Config API merging complexity | Start with simple env + runtime merge; iterate |

---

## ✅ Success Criteria (Extended)

- `@neuralforge/ws-server` supports bidirectional streaming connections
- `POST /v1/config` accepts and returns runtime configuration
- Plugin manifest format documented and versioned
- Local model (Ollama/LMStudio) integration functional
- Web app (`apps/web`) integrates with SDK via `@neuralforge/sdk`
- All packages build with `pnpm run build` (`tsc -b`)

---

## 🚀 Next Immediate Actions

**Phase 2: Start with `packages/ws-server`** — Create the gRPC/WebSocket package that enables bidirectional streaming. This builds on the gateway foundation and is essential for VS Code/Cursor/Windsurf integration.

**Phase 3: Then `packages/config-api`** — Implement the REST configuration API for dynamic runtime switching.

**Phase 4-5: Plugin system and local model support** — Track C items for extensibility and offline capability.

---

## 📚 API Surface (Extended Target)

```typescript
// SDK usage (Phase 1, already done)
import { createRuntime, type AgentRuntime } from '@neuralforge/sdk'

// WebSocket events (Phase 2, to be implemented)
ws.send({ type: 'subscribe', task_id: 'abc123' })
ws.on('progress', (data) => { /* ... */ })
ws.on('completion', (data) => { /* ... */ })

// Config API (Phase 3, to be implemented)
POST /v1/config
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet",
  "temperature": 0.2
}
```

---

## 📦 Package Status Summary

| Package | Status | Phase |
|---------|--------|-------|
| `@neuralforge/types` | ✅ Complete | — |
| `@neuralforge/shared` | ✅ Complete | — |
| `@neuralforge/sdk` | ✅ Complete | Track B: p.1 |
| `apps/web` | ✅ Complete | — |
| `apps/api` | ✅ Complete | User request |
| `@neuralforge/ws-server` | ⏳ Pending | Track B: p.2 |
| `@neuralforge/config-api` | ⏳ Pending | Track B: p.3 |
| `@neuralforge/plugins` | ⏳ Pending | Track C: p.1 |
| `@neuralforge/local` | ⏳ Pending | Track C: p.2 |

---

## 📝 Plan File

Saved to: `Z:\project\neuralforge\.kilo\plans\1793741585659-rocksoul-dx-developer-platform-plan-phases2-6.md`

This plan is ready for implementation by an agent capable of source code changes. The plan covers all remaining phases from the rocksoul-dx Developer Platform roadmap, building on the SDK package (Phase 1) that has just been completed.