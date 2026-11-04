# NeuralForge Master Blueprint — Product Vision

## Document: 01-product-vision.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Mission Statement

**Transform web AI providers into a local-first coding agent that gives developers full control over their code, data, and execution environment.**

### Vision

Every developer should have access to AI-augmented coding without:
- API keys or cloud dependencies
- Data privacy concerns
- Vendor lock-in
- Network latency

### Core Value Propositions

1. **Local-First Privacy**: Code analysis and generation never leaves the user's machine
2. **Provider Freedom**: Switch between ChatGPT, Gemini, Grok, DeepSeek, GLM, Kimi without changing code
3. **Full Control**: Inspect, edit, and execute agent-generated code locally
4. **No API Costs**: Use existing web accounts instead of paying per-token
5. **Extensible Architecture**: Plugin system for custom tools and integrations

### Target Users

| User Type | Pain Points | NeuralForge Solution |
|-----------|-------------|------------------|
| Independent Developer | API costs, privacy concerns | Free, local, no key needed |
| Enterprise Team | Compliance, data sovereignty | Local execution, audit logs |
| Hobbyist/Maker | Complex setup barriers | Zero-config, browser-based |
| Education/Research | Budget constraints for AI | Free access to existing accounts |

### User Journeys

#### 1. New User Onboarding
```
Step 1: Open http://localhost:3000
Step 2: Navigate to Providers → Connect (e.g., ChatGPT)
Step 3: Complete browser login in opened window
Step 4: Return to Workspace → Type task
Step 5: Agent executes → Result appears in UI
```

#### 2. Coding Task Execution
```
Step 1: User types: "Create hello.js with console.log"
Step 2: Job queued → Provider selected
Step 3: Browser automates → Writes file
Step 4: Terminal executes → Verifies output
Step 5: Result displayed → Continue or iterate
```

#### 3. Multi-Provider Switching
```
Step 1: User selects different provider in UI
Step 2: Session switches → New Chrome profile launched
Step 3: Authentication re-verified
Step 4: Task resumes with new provider
```

### Product Boundaries

#### In-Scope
- ✅ Code generation and analysis
- ✅ File creation and editing via agent
- ✅ Terminal execution of generated scripts
- ✅ Image generation (via provider's native tools)
- ✅ Music generation (via Gemini native)
- ✅ Provider switching and management
- ✅ Job tracking and status monitoring
- ✅ Plugin extensibility

#### Out-of-Scope
- ❌ Cloud storage integration (user's responsibility)
- ❌ Multi-user collaboration (single-user per instance)
- ❌ Source code hosting (Git/github is separate)
- ❌ CI/CD pipeline execution (local only)
- ❌ Production deployment (local only)
- ❌ Multi-language runtime support beyond Node.js
- ❌ API key management (no keys used)

### Competitive Positioning

| Competitor | Approach | NeuralForge Differentiator |
|------------|----------|----------------------|
| GitHub Copilot | VS Code extension, cloud | Local execution, provider choice |
| Claude Code | Standalone, API key | No API key, browser session |
| Cursor | VS Code fork, cloud | Full local control |
| OpenDevin | Open-source agent, complex | Simpler, pnpm workspace, modern stack |

### Product Roadmap Milestones

| Milestone | Target | Description |
|-----------|--------|-------------|
| M1 — MVP Launch | Month 1 | Core job system, 3 providers, basic tools |
| M2 — Provider Expansion | Month 2 | All 6 providers, image generation |
| M3 — Plugin System | Month 3 | Custom tool registry |
| M4 — Multi-Project | Month 4 | Workspace switching |
| M5 — CI/CD | Month 5 | Automated testing and deployment |
| M6 — Production | Month 6 | Docker, monitoring, release |

### Product Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to First Task | <5 minutes | From open UI to completed task |
| Provider Switch Time | <30 seconds | Switch between providers |
| Job Success Rate | 80%+ | Jobs completing without error |
| User Satisfaction | 4/5+ | Post-task survey |
| Documentation Coverage | 100% | All specs have corresponding docs |

---

## Success Criteria

1. ✅ Product vision communicates value clearly
2. ✅ User journeys cover all major scenarios
3. ✅ Scope boundaries prevent feature creep
4. ✅ Target users identified with specific pain points
5. ✅ Competitive positioning differentiates from alternatives
6. ✅ Roadmap milestones are concrete and time-bound
7. ✅ Metrics are measurable and trackable

---

## Assumptions & Unknowns

| Assumption | Risk | Mitigation |
|------------|------|------------|
| Users have web AI accounts | Medium | Provide onboarding guidance |
| Browser DOM stable short-term | Medium | Fallback selectors in adapters |
| Single-user per installation | Low | Accept as local-first design |
| Node.js 20+ adoption | Medium | Engage LTS Long Term Support |
| PGlite maturity | Medium | Version pin, monitor issues |