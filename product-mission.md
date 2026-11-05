# Product Mission for Rocksoul DX Developer Platform

## Mission Statement

Build **Rocksoul DX Developer Platform** as a local-first, modular, embeddable developer platform unifying web-based LLM subscriptions into one integrated autonomous developer experience. Platform menyediakan satu fondasi eksekusi yang dapat dipakai melalui CLI, Web War Room, REST API, SDK, WebSocket, MCP, dan integrasi IDE/CI.

### Core Pillars

1. **Local-first bukan berarti semua provider offline**
   - File system, workspace, orchestrator, dan eksekusi tool dapat berjalan lokal
   - Browser-based AI provider tetap merupakan layanan pihak ketiga
   - Dokumentasi wajib menyatakan aliran data ini secara jujur

2. **No API key hanya berlaku untuk alur yang memakai akun web/browser session atau provider lokal**
   - Adapter API-key boleh menjadi opsi terpisah di masa depan, bukan asumsi tersembunyi

3. **No cloud dependency tidak boleh diklaim untuk browser provider**
   - Gunakan istilah local execution / local data control dengan penjelasan outbound data yang jelas

4. **Tidak ada provider fallback diam-diam dari model lokal ke provider web atau sebaliknya**

5. **Semua interface memakai domain contract, permission model, error model, dan event model yang sama**

6. **UI bukan sumber kebenaran status job**
   - Job store/runtime adalah sumber kebenaran; UI hanya merefleksikan state server

7. **Plugin, tool, terminal, browser, dan file workspace selalu melewati trust boundary yang sesuai**

8. **Satu kemampuan tidak disebut "complete/production-ready" hanya karena file source atau package folder sudah ada**

### Platform Integration Points

The platform provides one executable foundation that can be used via:
- **CLI**: Command-line interface for autonomous agent execution
- **Web War Room**: Web-based interface for monitoring and managing agent runs
- **REST API**: Representational State Transfer API for programmatic access
- **SDK**: Software Development Kit for integrating platform capabilities
- **WebSocket**: Real-time communication for agent sessions
- **MCP**: Multi-Channel Protocol for distributed agent operations
- **IDE/CI Integration**: Integration with Integrated Development Environments and Continuous Integration systems

### Trust & Governance

- **Policy enforcement**: Path/command boundary, approval, secret handling, audit trail, safe defaults
- **Operations**: Persistence, migration, backup/restore, health/readiness, local telemetry control, packaging, deployment, upgrade, dan rollback
- **Provider Mesh**: Adapter AI berbasis browser session serta provider lokal seperti Ollama dan LM Studio; capability, health, fallback, dan quota harus eksplisit

### Extensibility

- **Tool registry**: Daftar tool yang terdaftar
- **Plugin manifest**: Manifest plugin dengan permission model
- **Version plugin**: Versi plugin yang teratur
- **Eksekusi terisolasi**: Tools and plugins diizoliasi saat dieksekusi

### Developer Experience

- **CLI**: task lifecycle, planning, tools, runtime, transcript, session recovery, artifacts, dan verifikasi hasil
- **Provider Mesh**: adapter AI berbased browser session serta provider lokal
- **Developer Interfaces**: CLI, Web War Room, REST/OpenAPI, SDK, WebSocket, MCP, integrasi IDE/CI
- **Trust & Governance**: policy enforcement, path/command boundary, approval, secret handling, audit trail, safe defaults

---
*Product mission established for DX-052 task completion. Updated: 2026-11-05*