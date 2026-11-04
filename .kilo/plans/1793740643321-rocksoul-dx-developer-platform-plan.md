# rocksoul-dx Developer Platform Plan

## Overview

Transform WTAgent from a CLI browser automation tool into a **rocksoul-dx Developer Platform** — a extensible, embeddable SDK and runtime platform for AI-assisted development workflows.

Current state: Monorepo with 17 packages, Next.js web app at `apps/web`, TypeScript strict mode, 687+ tests.

---

## 🎯 Goal

Enable developers to embed, extend, and integrate WTAgent capabilities into IDEs, CI/CD pipelines, and custom workflows — without requiring MCP or tunnel infrastructure.

---

## 📦 Package Structure

| Package | Purpose |
|---------|---------|
| `@wtagent/types` | Shared TypeScript types (existing) |
| `@wtagent/shared` | Common utilities (existing) |
| `@wtagent/browser` | Browser automation adapters (existing) |
| `@wtagent/runtime` | Agent runtime (existing) |
| `@wtagent/gateway` | OpenAI-compatible HTTP server (existing) |
| `@wtagent/job` | Job execution orchestrator (existing) |
| `@wtagent/mcp` | Model Context Protocol (existing) |
| **`@wtagent/sdk`** | **Importable JS/TS library for IDEs, Electron, Docker** |
| **`@wtagent/ws-server`** | **gRPC / WebSocket bidirectional streaming** |
| **`@wtagent/config-api`** | **REST `/v1/config` dynamic runtime switching** |
| **`@wtagent/plugins`** | **Plugin system for community tools** |
| **`@wtagent/local`** | **Local model support (Ollama, LMStudio)** |
| **`apps/web`** | **Next.js web interface (new)** |

---

## 🛠️ Implementation Roadmap

### Phase 1: SDK Package (`@wtagent/sdk`) — *Track B: p.1*
- [ ] Create `packages/sdk` with entry point exposing core types and runtime
- [ ] Export key interfaces: `AgentRuntime`, `BrowserAdapter`, `JobRequest`
- [ ] Add TypeScript types published to npm
- [ ] Example: `import { createRuntime } from '@wtagent/sdk'`

### Phase 2: gRPC / WebSocket Server — *Track B: p.2*
- [ ] Create `@wtagent/ws-server` package
- [ ] Bidirectional streaming for real-time agent operations
- [ ] VS Code / Cursor / Windsurf integration hooks
- [ ] Connection lifecycle management

### Phase 3: Configuration REST API — *Track B: p.3*
- [ ] Create `@wtagent/config-api` package
- [ ] `POST /v1/config` — dynamic model/parameter switching at runtime
- [ ] OpenAPI spec for platform consumers
- [ ] Environment variable + runtime config merging

### Phase 4: Plugin System — *Track C: p.1*
- [ ] Create `@wtagent/plugins` package
- [ ] Manifest-based plugin discovery
- [ ] GitHub, Jira, DB community tool templates
- [ ] Sandboxed execution context for plugins

### Phase 5: Local Model Support — *Track C: p.2*
- [ ] Create `@wtagent/local` package
- [ ] Ollama and LMStudio integration
- [ ] Offline/air-gapped mode flag
- [ ] Model capability detection

### Phase 6: Web App Enhancements — *Track A completion*
- [ ] DOM-drift resilience (Tahap 2.2)
- [ ] Visible progress indicators (Tahap 2.3)
- [ ] Token/size budget & retry policies (Tahap 2.4)

---

## 🔌 API Surface (Target)

```typescript
// SDK usage
import { createRuntime, type AgentRuntime } from '@wtagent/sdk'

const runtime: AgentRuntime = createRuntime({
  provider: 'openai',
  model: 'gpt-4o',
  browser: true,
})

await runtime.submit({
  task: 'Write a Python script to sort a file',
  onProgress: (update) => console.log(update),
})

// Config API
POST /v1/config
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet",
  "temperature": 0.2
}

// WebSocket events
ws.send({ type: 'subscribe', task_id: 'abc123' })
ws.on('progress', (data) => { /* ... */ })
ws.on('completion', (data) => { /* ... */ })
```

---

## 📚 Dependencies & Boundaries

### Existing (reuse)
- `@wtagent/types` — type definitions
- `@wtagent/shared` — env parsing, path resolution
- `@wtagent/browser` — browser adapters
- `@wtagent/runtime` — agent execution
- `@wtagent/gateway` — HTTP server foundation
- `@wtagent/job` — task orchestration

### New packages to create
- `packages/sdk` — importable library
- `packages/ws-server` — gRPC/WebSocket runtime
- `packages/config-api` — REST configuration
- `packages/plugins` — extensibility framework
- `packages/local` — local model support

### Shared dependencies
- All new packages depend on `@wtagent/types` and `@wtagent/shared`
- TypeScript `composite: true` + `incremental: true` builds

---

## ⚠️ Risks & Constraints

| Risk | Mitigation |
|------|-----------|
| SDK surface area too narrow | Start with core types; iterate based on consumer feedback |
| gRPC/WebSocket complexity | Use existing `net`/`ws` foundations from `@wtagent/gateway` |
| Plugin sandboxing security | Delegate to Docker/gVisor in future phases; start with allowlist |
| Type compatibility across packages | Enforce `composite: true` and shared `tsconfig.json` |

---

## ✅ Success Criteria

- `@wtagent/sdk` publishable to npm with `types` and `main` entries
- `@wtagent/ws-server` supports bidirectional streaming connections
- `POST /v1/config` accepts and returns runtime configuration
- Plugin manifest format documented and versioned
- Local model (Ollama/LMStudio) integration functional
- Web app (`apps/web`) integrates with SDK via `@wtagent/sdk`

---

## 🚀 Next Immediate Action

**Start with: `packages/sdk`** — Create the importable `@wtagent/sdk` package that exposes the core runtime API. This is the foundation for all other platform pieces (IDE embedding, gRPC, config API).

Then: **Track A Tahap 2.2** (DOM-drift resilience) for immediate reliability gains on the existing CLI.

---