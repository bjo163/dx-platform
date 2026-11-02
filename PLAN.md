# WTAgent Development Plan

## 📊 Current State (As of 2026-11-02)

| Metric | Status |
|--------|--------|
| **Workspace Packages** | 17/17 compiled |
| **TypeScript Errors** | 0 TS7006 (implicit `any` fixed) |
| **Test Suite** | 687 passed · 15 skipped · 41 files |
| **Build System** | pnpm monorepo + `tsc -b` |
| **Strict Mode** | `composite: true`, `incremental: true` |
| **Git Status** | Clean (pushed to main) |
| **Core Features** | MCP server, OpenAI gateway, Job runner, Public contracts |

---

## 🎯 Next Phase Options

### **Track A: Tahap 2.x Completion** (Recommended for Stability)
*Complete hardening of existing browser automation stack*

| Task | Description | Priority | Effort |
|------|-------------|----------|--------|
| **Tahap 2.2: DOM-drift resilience** | Robust element selection, fallback strategies, structural failure reports, recovery on page changes | **HIGH** | 2-3 turns |
| **Tahap 2.3: Visible progress while waiting** | Real-time progress indicators, ETA, turn counters, user notifications during long operations | **MEDIUM** | 1-2 turns |
| **Tahap 2.4: Per-turn token/size budget & retry policy tests** | Budget tracking, adaptive retries, quota protection, edge case test coverage | **HIGH** | 2-3 turns |

**Why Track A**: You get **enterprise-grade reliability** for production use. No new features — just solidifying what already works.

---

### **Track B: API Expansion & Ecosystem** (For IDE/Embedding Integration)
*Extend WTAgent beyond CLI → embeddable SDK / IDE integration*

| Feature | Description | Value | Effort |
|---------|-------------|-------|--------|
| **SDK Package** (`@wtagent/sdk`) | Importable JS/TS library for IDEs, Electron apps, Docker wrappers | Enables third-party IDE adoption | 3-4 turns |
| **gRPC / WebSocket Server** | Real-time bidirectional streaming (VS Code, Cursor, Windsurf integration) | Native IDE experience | 3-4 turns |
| **Configuration API** (REST `/v1/config`) | Dynamic model/parameter switching at runtime | Runtime flexibility | 1-2 turns |
| **MCP Client SDK** | Call WTAgent from other MCP hosts | Interoperability | 2-3 turns |

**Why Track B**: You enable **third-party IDE adoption** (Cursor, Windsurf, Zed, VS Code extensions) and **programmatic embedding**.

---

### **Track C: Advanced Features & Innovation** (Competitive Differentiation)
*Unique moat vs Codex/Claude Code*

| Feature | Description | Value | Effort |
|---------|-------------|-------|--------|
| **Multi-Provider Orchestration** | Auto-failover: ChatGPT → Gemini → Grok on quota/rate limits | Never hit limits again | 3-4 turns |
| **Persistent Memory Layer** | Vector DB + SQL + filesystem hybrid for cross-session context | Long-term memory across sessions | 3-4 turns |
| **Tool Sandboxing** | Containerized tool execution (Docker/gVisor) for security | Safe tool execution in untrusted env | 2-3 turns |
| **Agent Marketplace / Plugins** | Community tool plugins (GitHub, Jira, DB, etc.) | Extensible ecosystem | 3-4 turns |
| **Local Model Support** (Ollama, LMStudio) | Offline/private use via local LLMs | Air-gapped / privacy-focused | 2-3 turns |

**Why Track C**: You become the **only "multi-LLM, offline-capable, plugin-extensible"** agent framework.

---

## 📋 Recommended Immediate Action

**Start with: Tahap 2.2: DOM-drift resilience**

### Technical Specification

```markdown
## 🎯 Goal: DOM-drift resilience

**Problem**: Browser adapters break when providers change DOM selectors

**Solution**:
1. **Robust element selection** — multiple fallback selectors per element
2. **Recovery strategies** — refresh/reconnect on structural change
3. **Diagnostics** — structural failure reports with page layout hash
4. **Fallback protocols** — use text content + position when selectors fail
```

### Implementation Steps

1. **Enhance `packages/browser/base-web-adapter.ts`**:
   - Add selector fallback chains (ID → CSS → XPath → text content)
   - Add DOM structure hash + snapshot on every interaction
   - Add structural change detection

2. **Update `packages/runtime/agent-runtime.ts`**:
   - Add recovery hooks for DOM drift
   - Add structural failure reporting to diagnostics

3. **Add tests**:
   - `test/dom-drift.test.js` — simulate provider DOM changes
   - Verify recovery works without session loss

---

## 🚀 Execution Plan

| Phase | Task | Target |
|-------|------|--------|
| **Phase 1** | Tahap 2.2 DOM-drift resilience | 2-3 turns |
| **Phase 2** | Tahap 2.3 Visible progress | 1-2 turns |
| **Phase 3** | Tahap 2.4 Budget & retry tests | 2-3 turns |
| **Phase 4** | Track B (SDK) or Track C (Multi-provider) | 3-4 turns |

---

## 📈 Success Criteria

| Metric | Target |
|--------|--------|
| DOM-drift recovery | 95%+ success rate on provider updates |
| Progress visibility | Sub-second feedback during waits |
| Budget enforcement | Never exceed per-turn token limits |
| Test coverage | 80%+ branch coverage on browser adapters |

---

## 📖 Documentation to Update

- `README.md` — Add DOM-drift resilience notes
- `DESIGN.md` — Add browser adapter architecture
- `ARCHITECTURE.md` — Add SDK/WebSocket interfaces
- `CONTRIBUTING.md` — Add plugin development guide

---

## 🔄 Next Steps

**Reply with your choice**:
1. **Track A** → Start **Tahap 2.2** (recommended)
2. **Track B** → Start **@wtagent/sdk** package
3. **Track C** → Start **Multi-Provider Orchestration**

Or I'll start **Tahap 2.2** immediately and keep you posted.