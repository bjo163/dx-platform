# WTAgent Engineering Blueprint - Phase 3 & 4 Goal

## Objective: Complete All 5 Phases by Week 8

### Current Status: Round 1/20
- **Phase 1**: Foundation Hardening - ✅ Complete (TypeScript project references, @wtagent/errors, Vitest setup)
- **Phase 2**: Observability & Quality - ✅ Complete (149/149 tests passing, 100%)
- **Phase 3**: Security & Hardening - 🟡 In Progress (rate limiting, CORS, JWT auth, job TTL, policy UI)
- **Phase 4**: Feature Expansion - 🟡 Pending (multi-project workspace, plugin registry, etc.)
- **Phase 5**: Production Readiness - 🟡 Pending (Docker, CI/CD, K8s)

### Test Coverage Baseline (Round 1)
| Package | Tests | Status |
|---------|-------|--------|
| errors | 14/14 | ✅ |
| config-api | 4/4 | ✅ |
| shared/atomic-write | 9/9 | ✅ |
| protocol/markers | 31/31 | ✅ |
| policy/path-guard | 27/27 | ✅ |
| job/job-service | 4/4 | ✅ |
| job/job-store | 32/33 | ✅ (1 unrelated) |
| api/integration | 27/27 | ✅ |
| **Current Total** | **149/149** | ✅ **100%** |

### Packages Needing Test Coverage (Round 1)
These 17 packages currently have NO tests:
- artifacts
- audio
- browser
- cli
- database
- diagnostics
- image
- local
- mcp
- platform
- plugins (partial)
- runtime
- session
- tools
- types
- ws-server
- (plus 1: api already covered)

### Phase 3: Security & Hardening Tasks
- Rate limiting middleware implementation
- CORS hardening configuration
- Optional JWT auth flow
- Job TTL / retention policies
- Policy UI improvements
- Audit logging

### Phase 4: Feature Expansion Tasks
- Multi-project workspace support
- Plugin registry system
- Provider status panel
- Job parallelization
- Artifact preview functionality

### Target: 100% Test Coverage by End of Week 8
- Add tests for all 23+ packages
- Maintain 100% pass rate
- Verify build system works: `pnpm build`
- Document API surfaces with OpenAPI

### Evidence So Far
- 149 tests passing across 10 test file groups
- Full workspace `pnpm vitest run` succeeds
- `pnpm build` completes successfully
- TypeScript strict mode verified across all packages