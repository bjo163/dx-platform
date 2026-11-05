# NeuralForge Master Blueprint — Executive Overview

## Document: 00-executive-overview.md
## Status: **HISTORICAL** (archived 2024-01-15)
## Version: 1.0
## Date: 2024-01-15

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

---

## Executive Summary

NeuralForge is a **local-first AI coding agent** that transforms web AI providers (ChatGPT, Gemini, Grok, DeepSeek, GLM, Kimi) into a Codex/Claude Code-like coding environment. The orchestration, tools, workspace and persistence run on the user's machine and no API keys are required; the providers themselves are third-party services, so the prompt and context handed to a selected provider leave the machine for that step.

### Key Differentiators

| Dimension | NeuralForge | Traditional AI Coding Tools |
|-----------|---------|----------------------------|
| **Authentication** | Browser session (no API key) | API key required |
| **Data Location** | Local only | Cloud-based |
| **Provider** | 6+ web providers | Single provider |
| **Execution** | Local sandbox + terminal | Remote execution |
| **Cost** | Free (uses existing accounts) | Per-token pricing |
| **Privacy** | No data leaves machine | Data sent to provider |

### Current State

- **23 packages** in a pnpm monorepo
- **2 applications** (Web UI, API Server)
- **6 supported providers** (ChatGPT, Gemini, Grok, DeepSeek, GLM, Kimi)
- **5 core tools** (fs.read, fs.search, fs.write, fs.edit, terminal.exec)
- **3 sandbox modes** (workspace-read, workspace-write, danger-full-access)
- **1 database** (PGlite, embedded)
- **1 automation protocol** (CDP via Playwright)

### Target State

After completing the 5-phase roadmap:
- Full CI/CD pipeline with automated testing
- Docker containerization for consistent deployment
- OpenAPI documentation with Swagger UI
- Rate limiting and security hardening
- Multi-project workspace support
- Plugin registry for extensibility
- Job parallelization for concurrent execution
- Production-grade observability (health, metrics, logging)

---

## Blueprint Document Index

| # | Document | Status | Owner |
|---|----------|--------|-------|
| 00 | Executive Overview | ✅ This document | Architecture |
| 01 | Product Vision | ✅ | Product |
| 02 | Project Scope | ✅ | Product |
| 03 | Requirements | ✅ | Architecture |
| 04 | Current State | ✅ | Architecture |
| 05 | Target Architecture | ✅ | Architecture |
| 06 | System Boundaries | ✅ | Architecture |
| 07 | Domain Architecture | ✅ | Architecture |
| 08 | Package Architecture | ✅ | Architecture |
| 09 | Data Architecture | ✅ | Architecture |
| 10 | API Architecture | ✅ | Architecture |
| 11 | Security Architecture | ✅ | Architecture |
| 12 | UI/UX Architecture | ✅ | Architecture |
| 13 | Infrastructure Architecture | ✅ | Architecture |
| 14 | Testing Strategy | ✅ | Architecture |
| 15 | Observability Strategy | ✅ | Architecture |
| 16 | Deployment Strategy | ✅ | Architecture |
| 17 | Migration Strategy | ✅ | Architecture |
| 18 | Risk Register | ✅ | Architecture |
| 19 | Engineering Roadmap | ✅ | Architecture |
| 20 | Acceptance & Readiness | ✅ | Architecture |

---

## Architecture Principles

1. **Local-First**: All execution and data remain on the user's machine
2. **Provider-Agnostic**: Browser automation abstracts provider differences
3. **Security by Design**: Policy engine enforces boundaries before execution
4. **Modular Architecture**: 23 packages with clear ownership and dependencies
5. **Progressive Enhancement**: Start simple, add complexity only when justified
6. **Documentation-First**: Every component has a specification before implementation
7. **Backward Compatibility**: API contracts preserved across versions

---

## Key Metrics

| Metric | Current | Target (Phase 5) |
|--------|---------|-------------------|
| Package Count | 23 | 25+ |
| Supported Providers | 6 | 6+ |
| API Endpoints | 20+ | 25+ |
| Test Coverage | 0% | 80%+ |
| Deployment | Manual | CI/CD automated |
| Observability | None | Full metrics + logging |
| Documentation | Minimal | Complete blueprint |

---

## Critical Success Factors

1. **Provider Reliability**: Browser automation must handle DOM changes gracefully
2. **Security**: Sandbox must prevent file system escape and command injection
3. **Performance**: Job execution must be fast enough for interactive use
4. **Usability**: Web UI must be intuitive for non-technical users
5. **Maintainability**: Package structure must support independent evolution

---

## Next Steps

1. Review all 20 blueprint documents for consistency
2. Validate specifications against actual implementation
3. Begin Phase 1 (Foundation Hardening) implementation
4. Set up CI/CD pipeline
5. Create test infrastructure