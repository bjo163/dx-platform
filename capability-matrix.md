# Capability Matrix: Current vs Partial vs Planned

## Overview

This matrix captures the current state of capabilities based on manifest, source code, test coverage, workflow, and actual routes. Tidak ada capability diberi label "complete" hanya karena package directory ada.

## Capability Table

| Capability | Status | Evidence | Notes |
|------------|--------|----------|-------|
| **Agent Execution Core** | ✅ Current | Packages: runtime, job, session, artifacts, browser, tools, policy, protocol | Tested and verified CI passing |
| **Provider Mesh** | ⚠️ Partial | Packages: browser (7 providers: ChatGPT, Claude, DeepSeek, Gemini, Grok, Kimi, GLM), session, runtime | 7 provider aktif di registry; capability, health, fallback, quota harus eksplisit |
| **Developer Interfaces** | ✅ Current | Packages: cli, api, web | CLI smoke test passing; API build passing; Web build (Next.js) passing |
| **Extensibility** | ⚠️ Partial | Packages: plugins, tools, config-api | Plugin manifest/config registry ada; validasi permission, sandbox, lifecycle belum terbukut menyeluruh |
| **Trust & Governance** | ⚠️ Partial | Packages: policy, path-guard | Policy engine dan path guard dengan test; validasi sedang dikembangkan |
| **Operations** | ⚠️ Partial | Packages: database, observability (planned), openapi (planning) | PGlite persistence working; observability dan openapi masih dalam perencanaan |
| **SDK** | ⚠️ Partial | Package: sdk | Public factory saat ini berupa stub/echo object, belum factory runtime produksi |
| **WebSocket server** | ⚠️ Partial | Package: ws-server | Source ada, belum masuk workspace; protocol/security/testing perlu dilengkapi |
| **Config API** | ⚠️ Partial | Package: config-api | Class config ada; bukan bukti endpoint REST yang terpasang (sedang diperbaiki) |
| **Local model** | ⚠️ Partial | Package: local | Ada Ollama/LM Studio helper; cara eksekusi memalui shell command interpolation |
| **OpenAPI** | ⚠️ Partial | Package: openapi | Generator masih perlu diverifikasi; route discovery belum lengkap |
| **Observability** | 🟦 Planned | Not yet in workspace | Akan ditambahkan setelah inventory dan CI terverifikasi |
| **MCP** | ⚠️ Partial | Package: mcp | Source server dan tool definitions tersedia; perlu kontrak operasional/compatibility tests |
| **Skeleton packages** | 🟦 Planned | Packages: ws-server, local, openapi, observability | Masih perlu inventory dan CI verifikasi |

## Key Observations

1. **No capability diberi label "complete" hanya karena package directory ada** - This is a core principle from todo.md section 0.3

2. **Current state** (✅): Agent Execution Core, Developer Interfaces - fully implemented and tested

3. **Partial state** (⚠️): Provider Mesh, Extensibility, Trust & Governance, Local model, OpenAPI, MCP - ada sumber daya tapi belum complete

4. **Planned state** (🟦): Observability, Skeleton packages - belum dimulai atau perlu inventory

5. **Version consistency**: All verified packages use version 1.0.3 consistently

6. **Key gaps**:
   - OpenAPI route discovery belum lengkap
   - Observability package belum diintegrasi ke workspace
   - Plugin sistem validasi permission belum menyeluruh
   - Local model shell command interpolation perlu digantikan native fetch

## Matrix Generation Notes

This matrix was generated from:
- Manifest data (package.json files)
- Source code inspection
- Test coverage (vitest run results)
- Actual routes (API endpoint verification)
- Workflow evidence (CI pipeline results)

*Capability matrix established for DX-053 task completion. Updated: 2026-11-05*