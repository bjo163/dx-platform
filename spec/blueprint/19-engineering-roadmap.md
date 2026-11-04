# WTAgent Master Blueprint — Engineering Roadmap

## Document: 19-engineering-roadmap.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Engineering Roadmap Overview

This document defines the phased implementation plan for WTAgent, organized into 5 phases over 10 weeks. Each phase has clear objectives, deliverables, dependencies, and acceptance criteria.

---

## Phase Overview

| Phase | Duration | Theme | Status |
|-------|----------|-------|--------|
| **Phase 1** | Week 1-2 | Foundation Hardening | 🟡 In Progress |
| **Phase 2** | Week 3-4 | Observability & Quality | ⚪ Planned |
| **Phase 3** | Week 5-6 | Security & Hardening | ⚪ Planned |
| **Phase 4** | Week 7-8 | Feature Expansion | ⚪ Planned |
| **Phase 5** | Week 9-10 | Production Readiness | ⚪ Planned |

---

## Phase 1: Foundation Hardening (Week 1-2)

### Objective
Establish documentation, configuration, and testing foundations to enable efficient development.

### Deliverables

| ID | Deliverable | Owner | Status |
|----|-------------|-------|--------|
| PH1-001 | Root README.md | Documentation | ✅ Complete |
| PH1-002 | .env.example templates | Platform | ✅ Complete |
| PH1-003 | ARCHITECTURE.md | Architecture | ✅ Complete |
| PH1-004 | Master Blueprint (20 docs) | Architecture | 🟡 In Progress |
| PH1-005 | TypeScript project references | Platform | ⚪ Pending |
| PH1-006 | @wtagent/errors package | Platform | ⚪ Pending |
| PH1-007 | Vitest configuration | Testing | ⚪ Pending |

### Dependencies
- None (foundational phase)

### Risks
- Documentation scope creep (mitigation: timebox)
- TypeScript refactoring complexity (mitigation: incremental)

### Exit Criteria
- [x] README.md published
- [x] .env.example templates created
- [x] ARCHITECTURE.md published
- [ ] All 20 blueprint documents complete
- [ ] TypeScript project references configured
- [ ] @wtagent/errors package published
- [ ] Vitest configuration merged

### Acceptance Criteria
- [x] README.md contains setup, architecture, API reference
- [x] .env.example templates for API and web
- [ ] All blueprint documents pass review
- [ ] `pnpm run build` completes without errors
- [ ] `pnpm run test` runs successfully

---

## Phase 2: Observability & Quality (Week 3-4)

### Objective
Implement comprehensive testing, monitoring, and documentation to ensure quality and visibility.

### Deliverables

| ID | Deliverable | Owner | Status |
|----|-------------|-------|--------|
| PH2-001 | Unit test suite (80% coverage) | Testing | ⚪ Planned |
| PH2-002 | Integration test suite | Testing | ⚪ Planned |
| PH2-003 | E2E test suite (Playwright) | Testing | ⚪ Planned |
| PH2-004 | OpenAPI documentation | API | ⚪ Planned |
| PH2-005 | Swagger UI integration | API | ⚪ Planned |
| PH2-006 | Health dashboard endpoint | API | ⚪ Planned |
| PH2-007 | Structured logging (pino) | Platform | ⚪ Planned |
| PH2-008 | Prometheus metrics endpoint | Platform | ⚪ Planned |

### Dependencies
- PH1-006 (@wtagent/errors)
- PH1-007 (Vitest configuration)

### Risks
- Test coverage targets unrealistic (mitigation: prioritize critical paths)
- OpenAPI spec drift (mitigation: auto-generation)

### Exit Criteria
- [ ] Unit test coverage >= 80%
- [ ] Integration tests for all API endpoints
- [ ] E2E tests for key user workflows
- [ ] Swagger UI accessible at /docs
- [ ] Health dashboard implemented
- [ ] Structured logging deployed
- [ ] Prometheus metrics exposed

### Acceptance Criteria
- [ ] `pnpm run test:cov` shows >= 80% coverage
- [ ] `pnpm run test:e2e` passes all tests
- [ ] `/docs` endpoint renders Swagger UI
- [ ] `/health` endpoint returns valid JSON
- [ ] Logs output in JSON format
- [ ] `/metrics` endpoint returns Prometheus format

---

## Phase 3: Security & Hardening (Week 5-6)

### Objective
Harden security posture with authentication, rate limiting, and enhanced policy enforcement.

### Deliverables

| ID | Deliverable | Owner | Status |
|----|-------------|-------|--------|
| PH3-001 | Rate limiting middleware | API | ⚪ Planned |
| PH3-002 | CORS hardening | API | ⚪ Planned |
| PH3-003 | Optional JWT authentication | API | ⚪ Planned |
| PH3-004 | Job timeout configuration | Job | ⚪ Planned |
| PH3-005 | Policy engine UI improvements | UI | ⚪ Planned |
| PH3-006 | Audit log viewer | UI | ⚪ Planned |
| PH3-007 | Security headers middleware | API | ⚪ Planned |
| PH3-008 | Dependency vulnerability scanning | DevOps | ⚪ Planned |

### Dependencies
- PH2-007 (Structured logging)
- PH2-004 (OpenAPI documentation)

### Risks
- Authentication complexity (mitigation: optional, local-first)
- Rate limit tuning (mitigation: configurable defaults)

### Exit Criteria
- [ ] Rate limiting enabled on all endpoints
- [ ] CORS restricted to configured origins
- [ ] Optional JWT auth implemented
- [ ] Job TTL configuration added
- [ ] Policy UI shows approval requests
- [ ] Audit log viewer implemented
- [ ] Security headers deployed
- [ ] `pnpm audit` passes

### Acceptance Criteria
- [ ] Rate limit returns 429 after threshold
- [ ] CORS rejects unauthorized origins
- [ ] JWT auth can be enabled/disabled
- [ ] Jobs timeout after TTL expires
- [ ] Approval dialog shows in UI
- [ ] Audit log viewer displays entries
- [ ] Security headers present in responses
- [ ] No critical vulnerabilities in dependencies

---

## Phase 4: Feature Expansion (Week 7-8)

### Objective
Expand functionality with multi-project support, plugin system, and enhanced UX.

### Deliverables

| ID | Deliverable | Owner | Status |
|----|-------------|-------|--------|
| PH4-001 | Multi-project workspace support | UI | ⚪ Planned |
| PH4-002 | Plugin registry system | Platform | ⚪ Planned |
| PH4-003 | Provider status panel | UI | ⚪ Planned |
| PH4-004 | Job parallelization (concurrent workers) | Job | ⚪ Planned |
| PH4-005 | Artifact preview in UI | UI | ⚪ Planned |
| PH4-006 | Image generation UI improvements | UI | ⚪ Planned |
| PH4-007 | Music generation UI | UI | ⚪ Planned |
| PH4-008 | Session export/import | Platform | ⚪ Planned |

### Dependencies
- PH3-003 (Optional JWT auth)
- PH3-005 (Policy engine UI)

### Risks
- Feature scope creep (mitigation: MVP-first)
- Plugin system complexity (mitigation: simple initial API)

### Exit Criteria
- [ ] Multi-project switching implemented
- [ ] Plugin registry functional
- [ ] Provider status visible in UI
- [ ] Concurrent job execution works
- [ ] Artifact preview renders images/music
- [ ] Image generation UX improved
- [ ] Music generation UI added
- [ ] Session export/import works

### Acceptance Criteria
- [ ] User can switch between projects
- [ ] Plugins can be enabled/disabled
- [ ] Provider connection status shown
- [ ] Multiple jobs run concurrently
- [ ] Images/music preview in UI
- [ ] Session can be exported/imported

---

## Phase 5: Production Readiness (Week 9-10)

### Objective
Prepare for production deployment with containerization, CI/CD, and operational tooling.

### Deliverables

| ID | Deliverable | Owner | Status |
|----|-------------|-------|--------|
| PH5-001 | Docker multi-stage build | DevOps | ⚪ Planned |
| PH5-002 | Docker Compose configuration | DevOps | ⚪ Planned |
| PH5-003 | GitHub Actions CI/CD pipeline | DevOps | ⚪ Planned |
| PH5-004 | Kubernetes manifests | DevOps | ⚪ Planned |
| PH5-005 | Performance profiling report | Platform | ⚪ Planned |
| PH5-006 | Load testing results | Testing | ⚪ Planned |
| PH5-007 | Release automation (versioning, changelog) | DevOps | ⚪ Planned |
| PH5-008 | Production runbook | Documentation | ⚪ Planned |

### Dependencies
- PH4-002 (Plugin registry)
- PH2-008 (Prometheus metrics)

### Risks
- Docker image size (mitigation: multi-stage build)
- CI/CD complexity (mitigation: start simple)

### Exit Criteria
- [ ] Docker image builds successfully
- [ ] Docker Compose runs locally
- [ ] CI/CD pipeline executes on push
- [ ] Kubernetes manifests validated
- [ ] Performance profiling complete
- [ ] Load testing results documented
- [ ] Release automation working
- [ ] Production runbook published

### Acceptance Criteria
- [ ] `docker build` completes in < 5 minutes
- [ ] `docker compose up` starts all services
- [ ] CI pipeline runs tests on every PR
- [ ] K8s manifests deploy to test cluster
- [ ] Latency p95 < 100ms under load
- [ ] System handles 1000 RPS
- [ ] `git tag vX.Y.Z` triggers release
- [ ] Runbook covers all operational scenarios

---

## Milestone Summary

| Milestone | Target Date | Phases Complete | Key Deliverables |
|-----------|-------------|-----------------|------------------|
| **M1 — MVP Launch** | Week 2 | Phase 1 | Documentation, config, blueprint |
| **M2 — Quality Baseline** | Week 4 | Phase 1-2 | Tests (80% coverage), OpenAPI docs |
| **M3 — Security Hardening** | Week 6 | Phase 1-3 | Rate limiting, auth (opt), audit viewer |
| **M4 — Feature Complete** | Week 8 | Phase 1-4 | Multi-project, plugins, artifacts |
| **M5 — Production Ready** | Week 10 | Phase 1-5 | Docker, CI/CD, K8s, runbook |

---

## Resource Allocation

| Phase | Engineering | Design | DevOps | Documentation |
|-------|-------------|--------|--------|---------------|
| Phase 1 | 60% | 10% | 10% | 20% |
| Phase 2 | 50% | 10% | 20% | 20% |
| Phase 3 | 40% | 20% | 20% | 20% |
| Phase 4 | 60% | 20% | 10% | 10% |
| Phase 5 | 30% | 10% | 40% | 20% |

---

## Success Metrics

| Metric | Baseline | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|--------|----------|---------|---------|---------|---------|---------|
| Test Coverage | 0% | 0% | 80% | 85% | 85% | 90% |
| API Latency (p95) | N/A | N/A | <100ms | <100ms | <100ms | <50ms |
| Error Rate | N/A | N/A | <1% | <0.5% | <0.5% | <0.1% |
| Documentation Coverage | Minimal | 50% | 70% | 80% | 90% | 100% |
| Deployment Frequency | Manual | Manual | Weekly | Weekly | Daily | On-demand |
| Lead Time for Changes | N/A | N/A | 1 week | 3 days | 1 day | <4 hours |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |