# WTAgent Master Blueprint — Risk Register

## Document: 18-risk-register.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Risk Register Overview

This document identifies, assesses, and tracks risks to the WTAgent project. Each risk includes probability, impact, mitigation strategy, and contingency plans.

---

## Risk Assessment Matrix

| Probability | Low (1) | Medium (2) | High (3) |
|-------------|---------|------------|----------|
| **High (3)** | RISK-004 | RISK-001, RISK-005 | RISK-002 |
| **Medium (2)** | RISK-006, RISK-008 | RISK-003, RISK-007 | RISK-009 |
| **Low (1)** | RISK-010 | RISK-011, RISK-012 | RISK-013 |

**Risk Score = Probability × Impact**
- **Critical (9)**: Immediate action required
- **High (6-8)**: Mitigation plan needed
- **Medium (3-4)**: Monitor and prepare
- **Low (1-2)**: Accept and track

---

## Technical Risks

### RISK-001: Provider DOM Changes Break Automation

| Attribute | Value |
|-----------|-------|
| **Category** | Technical |
| **Probability** | High (3) |
| **Impact** | High (3) |
| **Score** | 9 (Critical) |
| **Owner** | Browser Team |

**Description**: Web AI providers (ChatGPT, Gemini, etc.) may change their DOM structure, breaking selector-based automation.

**Triggers**:
- Provider UI redesign
- A/B testing changes
- New feature rollout
- Class name obfuscation

**Mitigation**:
- Fallback selector chains (primary → secondary → tertiary)
- DOM version detection + adapter switching
- Regular selector validation tests
- Provider relationship monitoring (early warning)

**Contingency**:
- Emergency adapter update within 24 hours
- Temporary fallback to manual mode
- User notification + workaround guidance

**Status**: ⚠️ Active

---

### RISK-002: Browser Session Hijacking

| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Probability** | Medium (2) |
| **Impact** | High (3) |
| **Score** | 6 (High) |
| **Owner** | Security Team |

**Description**: Malicious actor could potentially access browser session cookies or inject commands.

**Triggers**:
- Local network compromise
- Malware on user machine
- Browser vulnerability
- Profile directory exposure

**Mitigation**:
- Isolated Chrome profiles per provider
- Profile directory permissions (0700)
- No credential storage in database
- Session validation before execution
- Regular security audits

**Contingency**:
- Immediate profile deletion + re-authentication
- Security incident response procedure
- User notification + remediation steps

**Status**: ✅ Mitigated (low probability with current controls)

---

### RISK-003: File Sandbox Escape

| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Probability** | Low (1) |
| **Impact** | High (3) |
| **Score** | 3 (Medium) |
| **Owner** | Security Team |

**Description**: Malicious code could potentially escape workspace sandbox and access arbitrary files.

**Triggers**:
- Path traversal vulnerability
- Symlink attack
- Command injection via terminal
- Policy engine bypass

**Mitigation**:
- PathGuard realpath validation
- Symlink detection + blocking
- Command allowlist/blocklist
- Policy engine with approval workflow
- Audit logging for all operations

**Contingency**:
- Immediate sandbox mode downgrade
- Security patch deployment
- User notification + security advisory

**Status**: ✅ Mitigated (multiple layers of defense)

---

### RISK-004: Job Queue Corruption

| Attribute | Value |
|-----------|-------|
| **Category** | Data Integrity |
| **Probability** | Medium (2) |
| **Impact** | Medium (2) |
| **Score** | 4 (Medium) |
| **Owner** | Platform Team |

**Description**: PGlite database corruption could cause job queue loss or inconsistent state.

**Triggers**:
- Disk failure
- Power loss during write
- Database bug
- Migration failure

**Mitigation**:
- WAL (Write-Ahead Logging) enabled
- Daily database snapshots
- Transaction-based operations
- Integrity checks on startup

**Contingency**:
- Restore from latest snapshot
- Manual job re-creation
- User notification + data recovery assistance

**Status**: ✅ Mitigated (WAL + backups)

---

### RISK-005: Provider Rate Limiting

| Attribute | Value |
|-----------|-------|
| **Category** | Operational |
| **Probability** | High (3) |
| **Impact** | Medium (2) |
| **Score** | 6 (High) |
| **Owner** | Provider Team |

**Description**: Web AI providers may implement rate limiting or bot detection, blocking automation.

**Triggers**:
- High request volume from single IP
- Automated behavior detection
- Provider policy changes
- Account suspension

**Mitigation**:
- Request throttling (max 10/min per provider)
- Human-like interaction patterns
- Session rotation (multiple accounts)
- Provider diversity (6 providers available)

**Contingency**:
- Automatic backoff + retry
- Switch to alternative provider
- User notification + quota guidance

**Status**: ⚠️ Active (monitoring provider behavior)

---

### RISK-006: Memory Leak in Long Sessions

| Attribute | Value |
|-----------|-------|
| **Category** | Performance |
| **Probability** | Medium (2) |
| **Impact** | Low (1) |
| **Score** | 2 (Low) |
| **Owner** | Platform Team |

**Description**: Long-running browser sessions may accumulate memory, causing performance degradation.

**Triggers**:
- Sessions running > 1 hour
- Large DOM structures
- Unreleased event listeners
- Memory fragmentation

**Mitigation**:
- Session TTL (30-minute inactivity timeout)
- Periodic garbage collection
- Memory monitoring + alerts
- Browser instance recycling

**Contingency**:
- Automatic session restart
- User notification + session save
- Memory profiling + fix deployment

**Status**: ✅ Mitigated (TTL + monitoring)

---

## Operational Risks

### RISK-007: Single Point of Failure (Browser Dependency)

| Attribute | Value |
|-----------|-------|
| **Category** | Operational |
| **Probability** | Medium (2) |
| **Impact** | Medium (2) |
| **Score** | 4 (Medium) |
| **Owner** | Platform Team |

**Description**: WTAgent depends entirely on Chrome/Chromium availability; browser issues block all operations.

**Triggers**:
- Chrome update breaks CDP
- OS-level Chrome issues
- Chrome unavailable on system
- CDP protocol changes

**Mitigation**:
- Support multiple browsers (Chrome, Chromium, Edge)
- CDP version compatibility matrix
- Graceful degradation (error messages)
- Browser auto-detection + fallback

**Contingency**:
- Emergency browser shim update
- Manual browser installation guidance
- Temporary service degradation notice

**Status**: ✅ Mitigated (multi-browser support)

---

### RISK-008: No CI/CD Pipeline

| Attribute | Value |
|-----------|-------|
| **Category** | Operational |
| **Probability** | High (3) |
| **Impact** | Medium (2) |
| **Score** | 6 (High) |
| **Owner** | DevOps Team |

**Description**: Manual testing and deployment increases risk of regressions and inconsistent releases.

**Triggers**:
- Human error in testing
- Skipped test steps
- Inconsistent deployment environments
- Release pressure

**Mitigation**:
- Implement GitHub Actions CI/CD (Phase 5)
- Automated test suite (80%+ coverage)
- Staging environment parity
- Release checklist automation

**Contingency**:
- Manual regression testing
- Rollback to previous version
- Hotfix deployment procedure

**Status**: ⚠️ Planned (Phase 5)

---

### RISK-009: Documentation Gaps

| Attribute | Value |
|-----------|-------|
| **Category** | Operational |
| **Probability** | Medium (2) |
| **Impact** | Medium (2) |
| **Score** | 4 (Medium) |
| **Owner** | Documentation Team |

**Description**: Incomplete documentation increases onboarding time and maintenance burden.

**Triggers**:
- New team members
- Feature additions without docs
- Architecture changes undocumented
- API changes unrecorded

**Mitigation**:
- Documentation-first development policy
- Blueprint document completion (20 docs)
- API auto-documentation (OpenAPI)
- Regular documentation audits

**Contingency**:
- Documentation sprint
- Community contribution program
- Video tutorials + examples

**Status**: ✅ Mitigated (blueprint in progress)

---

## Business Risks

### RISK-010: Provider Account Suspension

| Attribute | Value |
|-----------|-------|
| **Category** | Business |
| **Probability** | Low (1) |
| **Impact** | High (3) |
| **Score** | 3 (Medium) |
| **Owner** | Legal/Compliance |

**Description**: Web AI providers may suspend accounts used for automation, violating terms of service.

**Triggers**:
- ToS violation detection
- Automated usage patterns
- Account sharing
- High-volume usage

**Mitigation**:
- Human-like interaction patterns
- Rate limiting per account
- Multiple account support
- ToS compliance review

**Contingency**:
- Account rotation
- Legal review + appeal
- Alternative provider migration

**Status**: ⚠️ Monitor (ToS compliance ongoing)

---

### RISK-011: Competitive Pressure

| Attribute | Value |
|-----------|-------|
| **Category** | Business |
| **Probability** | Medium (2) |
| **Impact** | Low (1) |
| **Score** | 2 (Low) |
| **Owner** | Product Team |

**Description**: Competing AI coding tools may offer superior features or pricing.

**Triggers**:
- New competitor launch
- Feature parity from established players
- Pricing pressure
- Market consolidation

**Mitigation**:
- Focus on local-first differentiation
- Provider agnosticism (6+ providers)
- Community building + OSS model
- Rapid feature iteration

**Contingency**:
- Pivot to enterprise features
- Partnership opportunities
- Niche market focus

**Status**: ✅ Monitor (competitive analysis ongoing)

---

### RISK-012: Regulatory Changes

| Attribute | Value |
|-----------|-------|
| **Category** | Business |
| **Probability** | Low (1) |
| **Impact** | Medium (2) |
| **Score** | 2 (Low) |
| **Owner** | Legal/Compliance |

**Description**: AI regulations may impose restrictions on automation or data handling.

**Triggers**:
- New AI legislation
- Data privacy regulations
- Automation restrictions
- Export controls

**Mitigation**:
- Legal monitoring + compliance review
- Local-first architecture (data stays on machine)
- No PII storage
- Transparent automation (user-controlled)

**Contingency**:
- Compliance updates
- Feature restrictions by region
- Legal consultation

**Status**: ✅ Monitor (regulatory landscape stable)

---

### RISK-013: Talent Retention

| Attribute | Value |
|-----------|-------|
| **Category** | Business |
| **Probability** | Low (1) |
| **Impact** | High (3) |
| **Score** | 3 (Medium) |
| **Owner** | HR/Leadership |

**Description**: Key team members leaving could impact project continuity.

**Triggers**:
- Competitive offers
- Burnout from high workload
- Lack of career growth
- Team conflicts

**Mitigation**:
- Knowledge sharing + documentation
- Cross-training
- Clear career paths
- Competitive compensation

**Contingency**:
- Knowledge transfer procedure
- Contractor backup
- Hiring pipeline

**Status**: ✅ Mitigated (documentation + cross-training)

---

## Risk Review Schedule

| Review Type | Frequency | Participants | Output |
|-------------|-----------|--------------|--------|
| **Technical Risk Review** | Bi-weekly | Engineering leads | Updated risk scores |
| **Security Review** | Monthly | Security team | Security audit report |
| **Business Risk Review** | Quarterly | Leadership | Strategic adjustments |
| **Full Risk Audit** | Annually | All stakeholders | Risk register refresh |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |