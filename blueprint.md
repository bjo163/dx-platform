# Rocksoul DX — Product & Architecture Blueprint

> **Repository:** bjo163/dx-platform  
> **Product name:** Rocksoul DX  
> **Repository / technical name:** DX Platform  
> **Document type:** Product and target-architecture blueprint  
> **Revision:** 1.0  
> **Date:** 2026-11-05  
> **Canonical execution backlog:** [todo-v2.md](./todo-v2.md)  
> **North star:** One goal. Many agents. Any model. Verified outcomes.

---

## 1. Executive vision

Rocksoul DX is an **Autonomous Developer Operating System**: a local-first, model-agnostic system that coordinates the complete software-engineering loop—from a human goal to a verified, reviewable change.

It is not a new foundation model and it is not a promise that one agent can safely do everything. It is the platform around agents and models: intent capture, repository understanding, planning, orchestration, execution isolation, provider routing, memory, verification, governance, and operations.

The user should be able to describe an outcome. Rocksoul DX should decompose the outcome into small tasks, select appropriate execution engines, coordinate independent work, verify each result, and surface only decisions that genuinely require human authority.

**The central product promise is not “more agents.” It is “more verified outcomes with less unnecessary human attention.”**

### 1.1 North-star statement

> Give developers one place to direct work across any compatible model, agent, tool, and repository—then prove what changed, why it is correct, and what remains unresolved.

### 1.2 Product outcomes

1. A goal becomes a structured mission with scope, budget, dependencies, and acceptance criteria.
2. A mission becomes small tasks that less expensive agents can execute independently.
3. Agents work in isolated worktrees or sandboxes with least-privilege tools.
4. A router selects providers based on capability, privacy, verified performance, budget, quota, and health.
5. Repository context is retrieved from a revision-aware Repo Atlas rather than blindly dumping the entire repository into a prompt.
6. An independent Proof Engine validates diffs and records evidence.
7. A mission can pause, resume, recover from failures, and continue across sessions.
8. The War Room shows the actual backend state and highlights only meaningful blockers or approvals.
9. The system remains extensible through adapters and stable contracts.
10. Every claim of completion can be traced to evidence, commit, and CI.

---

## 2. Product positioning

### 2.1 Categories brought together

Rocksoul DX combines capabilities from several product categories:

| Category | User need | Rocksoul DX responsibility |
|---|---|---|
| Coding agents | Understand and change code | Agent runtime and execution adapters |
| Agent workforce/control planes | Assign and supervise work | Mission Control, scheduler, budget, and policy |
| Model/provider gateways | Reach different models and providers | Provider registry, capability and quality-aware router |
| Repository intelligence | Find relevant code and dependencies | Repo Atlas and context packer |
| Memory systems | Preserve useful context between runs | Scoped, sourced, freshness-aware memory |
| Verification/evaluation tools | Know whether a change is correct | Proof Engine and benchmark harness |
| Developer operations | Run, recover, and ship software | CLI, API, web UI, audit, packaging, backup, release |

### 2.2 Competitive principle

The objective is to improve **system-level engineering outcomes**, not to claim that Rocksoul DX has a smarter foundation model than Codex, Qoder, Claude, Gemini, or another provider.

Potential execution engines include the native runtime, compatible coding-agent CLIs, local models, and web/API providers where their supported interfaces and usage policies permit. Every integration must use an adapter and respect provider terms, rate limits, account boundaries, and data handling requirements.

Paperclip-like workforce management and OmniRoute/FreeLLMAPI-like gateway capabilities are reference categories, not targets for copying a proprietary implementation.

### 2.3 What the product is

- A mission and task control plane.
- A provider-agnostic orchestration system.
- A safe execution runtime and adapter ecosystem.
- A repository-context and memory system.
- A proof-carrying software-delivery workflow.
- A local-first developer operations layer.

### 2.4 What the product is not

- A foundation model training project.
- A blind “spawn as many agents as possible” system.
- A promise that all provider usage is offline or cloud-free.
- A tool to bypass provider usage limits, anti-bot systems, or subscription terms.
- A replacement for human authority over production, credentials, or destructive operations.
- A collection of duplicate packages created only to match a diagram.

---

## 3. Users and core jobs-to-be-done

### 3.1 Individual developer

**Goal:** “Fix this issue and prove that it is fixed.”

Needs:
- Point the system to a repository and issue/goal.
- See the plan and bounded task list.
- Allow routine implementation and testing to run autonomously.
- Inspect a concise diff and evidence report.
- Resume work after interruption.

### 3.2 Technical lead / maintainer

**Goal:** “Move several independent engineering goals forward without losing control.”

Needs:
- Mission-level priorities and budgets.
- Parallel agents with isolated worktrees.
- Dependency and conflict visibility.
- Independent review and merge eligibility.
- Audit trail and project-level memory.

### 3.3 Platform / operations engineer

**Goal:** “Keep agent execution safe, observable, recoverable, and deployable.”

Needs:
- Runtime/provider health.
- Resource limits and worker leases.
- Authentication, permissions, and secret handling.
- Backup/restore, upgrades, rollback, and runbooks.
- Reproducible CI and operational evidence.

### 3.4 Product researcher / architect

**Goal:** “Turn research and product intent into an executable engineering plan.”

Needs:
- Source-linked research notes.
- Architecture and trade-off summaries.
- Atomic task generation.
- Scope, dependency, and acceptance validation.
- Clear distinction between fact, assumption, and proposal.

---

## 4. Product experience

### 4.1 Primary interface: War Room

The War Room is the primary surface for directing and observing missions. It must be a projection of backend state, never the authority for task state.

**Primary navigation**
- Overview
- Missions
- Tasks
- Agent Fleet
- Projects / Workspaces
- Repo Atlas
- Intelligence / Providers
- Proof Center
- Activity / Audit
- Integrations
- Operations / Settings

### 4.2 Overview dashboard

The first screen should answer:
- What are we trying to accomplish?
- Which missions are active, blocked, or waiting?
- Which agents are working, idle, or unhealthy?
- What progress has been independently verified?
- Which provider/model is being used and why?
- Is there a task that needs human authority?
- Are the runtime, database, and workers healthy?

Suggested layout:
1. **Mission header:** selected project, goal, overall verified progress, budget.
2. **Active missions:** compact list with status, priority, owner/agent, and next dependency.
3. **Agent fleet:** role, adapter, current task, health, worktree, and resource usage.
4. **Intelligence cockpit:** providers, capabilities, routing decisions, quota, latency, and policy.
5. **Proof center:** checks passed/failed/inconclusive, evidence bundles, commit/CI links.
6. **Recent activity:** chronological domain events with correlation IDs.
7. **Needs Human:** only approvals, external authority requests, and irrecoverable blockers.

Progress must distinguish:
- tasks created;
- tasks currently executing;
- tasks whose implementation finished;
- tasks independently verified;
- tasks merged or released.

Do not use a single progress percentage that treats unverified work as completed.

### 4.3 Mission detail

A mission detail page includes:
- Goal and definition of success.
- Project/workspace scope.
- Parent mission and child task tree.
- Dependency graph.
- Priority, budget, deadline (if any), and risk level.
- Current agent assignments and run history.
- Verification and evidence.
- Changed files and commit references.
- Pause, resume, cancel, and retry controls only when those actions are valid for the server state.

### 4.4 Task detail

Each task shows:
- Task ID and parent mission.
- One bounded objective.
- Allowed paths/tools.
- Inputs and relevant Repo Atlas context.
- Dependencies.
- Acceptance criteria.
- Assigned agent/adapter/model.
- Worktree and diff.
- Targeted checks and their evidence.
- Final status and reason.

### 4.5 Agent detail

Each agent-run view includes:
- Adapter and version.
- Capability match.
- Model/provider and routing rationale.
- Task and scope.
- Current state and heartbeat.
- Tool invocations (redacted).
- Token/time/cost budget where measurable.
- Output artifacts and evidence.
- Stop/retry/resume reason.

### 4.6 Visual direction

**Design goal:** premium developer cockpit, readable under high information density—not a noisy sci-fi control panel.

- Dark theme as the primary visual identity; light theme remains a first-class mode.
- Deep charcoal surfaces, restrained violet/blue accents, semantic green/amber/red status colors.
- Clear typography, consistent spacing, sharp information hierarchy.
- Neon/glow reserved for focus and live state, not every container.
- Subtle grunge/neo-brutalist character in illustrations and marketing artwork; core operational UI stays precise and legible.
- Dense data tables must support keyboard navigation, filtering, sorting, and responsive behavior.
- Every status uses text/icon plus color; color alone is never the signal.
- Motion is purposeful and respects reduced-motion settings.
- No fake terminal text, fake agent logs, or decorative metrics presented as real data.

The generated marketing/mockup poster is a concept reference, not a screenshot of the implemented application.

---

## 5. Architecture principles

1. **Domain before UI:** define mission/task/job/provider/evidence contracts before adding UI state.
2. **One source of truth:** persisted domain state is authoritative.
3. **Bounded contexts:** use the existing workspace packages where appropriate; do not create a package for every concept.
4. **Adapters at the edges:** agents, providers, tools, storage, and interfaces integrate through explicit contracts.
5. **Least privilege by default:** permissions are scoped by project, task, tool, path, and action.
6. **Event-driven, not event-only:** commands mutate validated state; domain events describe committed changes.
7. **Idempotent operations:** retried requests and event replays must not create duplicate side effects.
8. **Recoverable execution:** leases, checkpoints, timeouts, and cancellation are first-class.
9. **Proof is independent:** the implementer does not control the final verification result.
10. **Local-first with explicit egress:** remote model use is visible, policy-controlled, and never hidden.
11. **Compatibility before migration:** package names, binary names, API, and data changes are migrated intentionally.
12. **Measure before optimize:** performance and model-routing changes need reproducible measurements.

---

## 6. Target architecture — six planes

These are logical responsibility boundaries. They map onto existing code where possible and do not prescribe a one-plane-per-package layout.

### 6.1 Control Plane

Responsibilities:
- Projects and workspaces.
- Mission creation and lifecycle.
- Goal, success criteria, priority, and budget.
- Human approvals and explicit authority boundaries.
- Mission templates and scheduled/event-triggered intake.
- Global overview and operational controls.

Invariants:
- A mission always belongs to an explicit project/workspace.
- The project root is resolved and validated before execution.
- Paused/cancelled missions do not schedule new child work.
- Every external action is evaluated against an authorization policy.
- UI actions are accepted only when valid for the current server state.

### 6.2 Orchestration Plane

Responsibilities:
- Plan validation and DAG dependency analysis.
- READY task selection and scheduling.
- Worker leases, heartbeats, fairness, and quotas.
- Retry classification and bounded backoff.
- Checkpoint, pause, resume, cancellation, and dead-letter handling.
- Merge queue coordination.

Invariants:
- Cyclic dependency graphs are rejected.
- A task cannot run before dependencies are satisfied.
- A worker must hold a valid lease to mutate a running task.
- Repeated submission with the same idempotency key does not create duplicate work.
- Retry limits and mission budgets are enforced by the system, not only prompts.

### 6.3 Execution Plane

Responsibilities:
- Native TypeScript runtime.
- External agent/CLI adapters.
- Tool registry and execution.
- Worktree and sandbox creation.
- Transcript and artifact collection.
- Process lifecycle, timeout, output budgets, cancellation.

Target adapter contract:
- Adapter identity and version.
- Declared capabilities.
- Input task specification.
- Scoped execution context.
- Structured output/result.
- Cancellation/timeout behavior.
- Artifact and event emission.
- Failure classification.

Invariants:
- One writer per worktree.
- Read-only scout/reviewer roles do not modify the workspace.
- A task cannot access paths outside its assigned scope.
- A failed worker cannot clean up another run's workspace.
- User changes present before a run are detected and preserved.

### 6.4 Intelligence Plane

Responsibilities:
- Provider and model registry.
- Capability discovery and normalization.
- Provider health, quota, cooldown, and latency.
- Task classification and model routing.
- Privacy-aware fallback.
- Quality score derived from verified outcomes.

Routing inputs:
- Task category and complexity estimate.
- Required tool-call, context, structured-output, vision, or streaming capabilities.
- Privacy class and allowed egress.
- Model/provider health.
- Verified task success history and sample size.
- Token/cost/time budget.
- Quota and cooldown.
- Expected latency.

Routing output:
- Selected provider/model/adapter.
- Capability match.
- Policy and privacy decision.
- Alternatives considered.
- Estimated budget use.
- Explicit fallback policy.
- A redacted decision record.

Invariants:
- Healthy does not mean capable.
- A provider with insufficient context or missing tools is not eligible.
- Local-only requests never call remote adapters.
- Fallback does not silently change the privacy class.
- Free-tier quota is not a reason to bypass provider controls or terms.
- Quality scores are confidence-aware and based on verified results.

### 6.5 Knowledge & Proof Plane

Responsibilities:
- Repo Atlas index and incremental updates.
- Source-located context retrieval.
- Scoped project/mission/task memory.
- Evidence collection and immutable revisions.
- Independent verification policies and verifier registry.
- Benchmark/evaluation harness.

Repo Atlas targets:
- Respect .gitignore and repository boundaries.
- Exclude sensitive path patterns by default.
- Avoid indexing browser profiles, env secrets, credentials, large binaries, and generated artifacts unless explicitly allowed.
- Store path, digest, language, symbols, line ranges, imports, package edges, tests, and revision.
- Incrementally update on Git changes.
- Track freshness and support deterministic rebuild.
- Return source references with every retrieved chunk.

Memory targets:
- Scopes: project, mission, task, agent run.
- Provenance: source path, commit/revision, source type, created time.
- Freshness and expiry metadata.
- Sensitivity classification.
- Deduplication and bounded retrieval.
- Corrections create revisions rather than silently overwriting provenance.
- Secret detection/redaction before persistence.

Proof Engine targets:
- Select checks by change type and risk.
- Run checks in a bounded environment with time/output budgets.
- Store exact command, exit code, timestamp, environment identity, and result.
- Tie results to the diff/commit SHA.
- Distinguish pass, fail, skipped, and inconclusive.
- Mark an implementation without sufficient checks as unverified.
- Produce machine-readable JSON and readable Markdown evidence reports.

### 6.6 Governance & Operations Plane

Responsibilities:
- Permission and approval engine.
- API/MCP/WS authentication.
- Secret and credential isolation.
- Audit records and redaction.
- Database migration, backup, and restore.
- Health, metrics, logs, and tracing.
- Packaging, container deployment, upgrade, and rollback.

Invariants:
- Default API bind is local-only unless secure remote mode is configured.
- Remote access requires authentication and explicit origin/network policy.
- Filesystem, process, network, browser, and secret permissions are independent.
- Secrets do not enter prompts/logs/transcripts/fixtures/artifacts by default.
- Dangerous or externally visible actions are not authorized by arbitrary repository text or model output.
- Audit records include actor, action, scope, policy decision, correlation ID, and time.
- Backup and restore are tested against disposable fixtures before production use.

---

## 7. Domain model

### 7.1 Core entities

| Entity | Meaning | Owns |
|---|---|---|
| Project | A logical codebase or engineering context | Workspace roots, policy defaults, project memory |
| Workspace | A concrete filesystem/repository boundary | Root path, Git context, allowed paths |
| Mission | A user goal with success criteria | Task graph, budget, priority, mission lifecycle |
| Task | One bounded unit of work | Scope, acceptance criteria, dependencies, task state |
| Job | A schedulable execution envelope | Queue state, retry, worker lease, time budget |
| AgentRun | One adapter/model execution attempt | Adapter, transcript, worktree, tool events, output |
| Provider | A model service or local inference endpoint | Capabilities, health, privacy class, quota |
| Tool | A callable operation under policy | Input/output schema, permission requirements |
| EvidenceBundle | Verification records for a task/revision | Checks, artifacts, digests, commit/CI links |
| RepoIndex | A revision-aware repository map | File/symbol/edge index and freshness |
| MemoryEntry | A sourced, scoped knowledge record | Provenance, sensitivity, confidence, expiry |
| Approval | A time-bounded authorization decision | Requester, scope, approver, policy, expiry |

### 7.2 Entity boundaries

- Mission is not a task.
- Task is not an attempt.
- Job is not an AgentRun.
- Provider health is not model capability.
- Agent output is not verification evidence.
- A UI status is not persisted domain state.
- A commit is not proof that tests passed.

### 7.3 Task lifecycle target

`draft → ready → running → review → verified`

Additional states:
- `blocked`: dependency, policy, provider, or environment blocker.
- `failed`: permanent failure or exhausted retry policy.
- `cancelled`: explicit cancellation.
- `deferred`: intentionally postponed with a reason.

Not every task must pass through review, but every task marked verified must have an EvidenceBundle satisfying its verification policy.

---

## 8. Planning and micro-task decomposition

### 8.1 Planner output contract

A valid plan node contains:
- Stable task ID.
- One-sentence objective.
- Bounded file/package scope.
- Inputs and required context.
- Explicit prerequisites.
- Expected output.
- Acceptance criteria with observable results.
- Risk and permission requirements.
- Suggested agent capability.
- Estimated time/token/cost budget.
- Verification command or verifier type.

### 8.2 Atomicity rules

- One task should deliver one inspectable result.
- Prefer 1–3 primary files plus tests.
- Target 5–30 minutes for a small execution agent.
- Split independent deliverables into separate tasks.
- Split work crossing subsystem boundaries unless the integration itself is the task.
- Avoid tasks requiring new product decisions or unavailable credentials.
- If a task turns out larger than expected, create child tasks and keep the parent as an integration/acceptance node.

### 8.3 Agent selection

Use the least expensive agent that satisfies task capability and quality requirements:
- Scout: read-only discovery and source mapping.
- Implementer: one bounded change.
- Test-fixer: reproduce and correct a failing test.
- Reviewer/verifier: independent inspection and check execution.
- Integrator: reconcile isolated diffs and run wider gates.
- Documentation gardener: reconcile docs with source and tests.

Do not spawn a swarm for a typo or one-line change. A simple task should usually be one implementer plus an independent verifier.

---

## 9. Execution and reliability

### 9.1 Mission-to-merge flow

1. **Intake:** validate request, project scope, and authorization.
2. **Inspect:** read Git status, current revision, policy, and relevant Repo Atlas entries.
3. **Plan:** create bounded tasks and dependency graph.
4. **Validate:** reject cycles, missing prerequisites, excessive scope, and invalid budget.
5. **Admit:** ensure the mission is within policy and resource limits.
6. **Schedule:** select READY tasks fairly.
7. **Assign:** choose adapter/model using capability, privacy, quality, and budget.
8. **Isolate:** allocate a task worktree or sandbox.
9. **Execute:** run tools with scoped permissions and record events.
10. **Collect:** store diff, transcript metadata, logs (redacted), and artifacts.
11. **Verify:** run independent targeted checks and policy gates.
12. **Repair:** create a bounded follow-up task for actionable failures.
13. **Integrate:** resolve conflicts in a dedicated integration context.
14. **Deliver:** generate evidence report and eligible PR/commit proposal.
15. **Recover:** on crash, resume from durable state without repeating committed side effects.

### 9.2 Concurrency and isolation

- One writer per worktree.
- Parallel tasks must have disjoint worktrees or explicitly non-overlapping scopes.
- A merge queue serializes conflicting integration.
- Worktree cleanup is owner-scoped and occurs only after evidence/artifacts are persisted.
- A pre-run check must detect unstaged/uncommitted user changes and preserve them.

### 9.3 Lease and checkpoint behavior

- Worker claim creates a unique lease token.
- Lease has an expiry and heartbeat renewal.
- Expired worker state can be reclaimed safely.
- Checkpoints are recorded at safe boundaries.
- Idempotency keys protect task submission, event ingestion, and supported external side effects.
- Cancellation propagates according to policy and stops child processes.
- Retries classify failures; transient retries use bounded backoff and a finite retry budget.
- Exhausted tasks enter a visible dead-letter/blocked state with diagnostic evidence.

### 9.4 Event system

All domain events use a versioned envelope:
- event ID and schema version;
- event type;
- timestamp;
- project/mission/task/run identifiers when applicable;
- source actor/adapter;
- correlation/causation IDs;
- typed payload.

Persist a committed event before broadcasting it. Consumers must support replay and cursor-based resume. Event delivery should be treated as at-least-once unless a specific mechanism proves stronger semantics.

---

## 10. Proof Engine and evidence graph

### 10.1 Required evidence

For a code change, an evidence bundle should include as applicable:
- Requirement/task reference.
- Base and resulting commit SHA.
- Changed file list and diff digest.
- Test/build/typecheck command.
- Exit code and duration.
- Verifier identity and version.
- Security/policy checks.
- Artifact digest.
- CI workflow/run ID and tested SHA.
- Skipped/inconclusive checks with reason.

### 10.2 Verification policy by change type

| Change type | Minimum checks |
|---|---|
| Documentation only | Markdown validation, link check where available, diff scope |
| Package metadata | Manifest schema, pack dry-run, import/CLI smoke |
| TypeScript module | Targeted tests, typecheck, package build |
| API behavior | Route/schema tests, integration test, auth/permission checks |
| Filesystem/process security | Regression tests for traversal, symlink, args, timeout, output limits |
| Database/migration | Migration test, backup/restore fixture, compatibility check |
| Web UI | Component/DOM tests, accessible names, responsive checks where available |
| Provider adapter | Offline contract test, timeout/error handling, privacy policy |
| Release/deployment | Build/package/container validation, SBOM/checksum, rollback/restore drill |

### 10.3 Verification outcomes

- **PASS:** all required checks ran and passed.
- **FAIL:** at least one required check failed.
- **SKIPPED:** the check was intentionally not run under a documented policy.
- **INCONCLUSIVE:** the environment or dependency was unavailable, so no success claim can be made.
- **UNVERIFIED:** no acceptable evidence bundle exists.

An implementer cannot set PASS or VERIFIED directly. The verifier calculates it from stored results.

### 10.4 Evidence graph

The target traceability chain is:

`Goal → Mission → Task → AgentRun → Diff/Artifact → Verification → Commit → CI Run → Merge/Release`

Missing links must be visible. A CI run for another SHA does not verify the current commit.

---

## 11. Provider intelligence and routing

### 11.1 Provider types

- Local inference endpoints (for example, a local runtime already supported by the host).
- API-based model providers.
- Browser-session providers where the integration is supported and permitted.
- Coding-agent CLI adapters.
- Deterministic fake providers for offline tests and benchmarks.

Each adapter declares its transport, capabilities, privacy/egress behavior, authentication requirements, rate/quota model, and supported cancellation/streaming semantics.

### 11.2 Routing stages

1. Classify task category and required capabilities.
2. Filter incompatible models/providers.
3. Enforce privacy and egress policy.
4. Filter unhealthy or cooling-down providers.
5. Apply quota and budget constraints.
6. Rank candidates using measured verified quality, latency, and cost.
7. Persist a redacted routing decision.
8. Apply fallback only when the request policy explicitly permits it.

### 11.3 Quality scoring

A score must include the number of observations and task-category scope. Do not rank a model based on a tiny sample or anecdote. Keep separate measurements for:
- successful verified tasks;
- regressions;
- repair attempts;
- latency;
- token/cost per accepted change;
- tool-call reliability;
- context-window fit;
- structured-output validity.

---

## 12. Repo Atlas and context engineering

### 12.1 Index contents

- Repository files and hashes.
- Language and size metadata.
- TypeScript/JavaScript symbols and source ranges.
- Imports, exports, workspace dependencies.
- Test-to-source associations.
- Documentation headings and links.
- Git revision and index freshness.

### 12.2 Indexing rules

- Respect .gitignore and repository roots.
- Exclude secrets, env files, private browser profiles, credentials, and sensitive data paths by default.
- Skip binaries and oversized files with a recorded reason.
- Use incremental updates based on Git changes and stable file fingerprints.
- Remove symbols/edges belonging to deleted files.
- Allow a deterministic full rebuild.
- Keep the index revision visible.
- Return source-located context chunks with a bounded token budget.

### 12.3 Retrieval strategy

Rank context using:
- task scope and named paths/symbols;
- import/export and dependency neighbors;
- related tests;
- recent changes;
- relevant docs/runbooks;
- memory with matching scope and valid provenance.

Do not send the entire repository to a model by default. A stale index should trigger refresh or a clear stale-context warning.

---

## 13. Memory and learning loop

Memory is not a hidden transcript dump. It is a collection of small, sourced records.

Each entry should include:
- scope (project, mission, task, run);
- content and type;
- source path/commit/document;
- confidence and sensitivity;
- created/updated timestamp;
- expiry/freshness information;
- deduplication identity.

Rules:
- Secrets are never stored as ordinary memory.
- Project memory is not automatically shared with unrelated projects.
- Facts without provenance are hypotheses, not authoritative facts.
- User corrections create a new revision.
- Retrieval is scoped and budgeted.
- Expired/stale entries are down-ranked or excluded.
- Memory can be exported, backed up, and deleted by scope with audit events.

---

## 14. Security and privacy model

### 14.1 Trust boundaries

1. **User / project workspace:** user-owned code and data.
2. **DX Platform control/runtime:** local orchestration, state, tool policies, and audit.
3. **Agent adapter process:** potentially untrusted execution boundary.
4. **Local model process:** local inference with its own filesystem/network boundary.
5. **Remote provider:** third-party service receiving explicitly transmitted request content.
6. **External integrations:** Git hosting, issue tracker, CI, deployment provider, and MCP server.

### 14.2 Minimum controls

- Local-only default bind for development API.
- Authentication before remote API, WS, or MCP access.
- Exact-origin CORS configuration.
- Path canonicalization, traversal defense, and symlink boundary tests.
- Process spawn with executable/argv separation; no shell interpolation by default.
- Command allowlists and scoped working directories.
- Time, memory/output, and concurrency budgets.
- Cancellation and child process cleanup.
- Secret redaction before logging or transcript persistence.
- Provider egress policy and explicit local-only behavior.
- Plugin manifest validation and least-privilege declarations.
- Audit records for policy deny/allow/approval.
- No authority escalation from untrusted prompt, repository content, issue text, or model output.

### 14.3 Human authority boundary

Autonomous agents may make routine and reversible engineering decisions inside the granted workspace and policy. Explicit human/environment authorization remains required for:
- production deployments or externally visible releases;
- package publication;
- credential/account changes;
- payments or paid resource provisioning;
- destructive persistent-data operations;
- migrations that cannot be safely rolled back;
- permission/network/filesystem privilege expansion;
- external data transmission not already authorized.

The system should prepare dry-runs and continue independent work rather than blocking the whole mission.

### 14.4 Privacy language

The project must not claim “100% local,” “no cloud,” “no data leaves the machine,” or “zero telemetry” unless each claim has a technically verified scope. Browser/API providers can process the content sent to them. The UI and docs must explain the selected provider and relevant egress class.

---

## 15. Interfaces and integration strategy

### 15.1 Supported interface targets

- CLI for automation and local developer workflows.
- Web War Room for missions, agents, providers, and evidence.
- REST API for domain commands and queries.
- WebSocket/SSE for versioned live events.
- TypeScript SDK for external applications.
- MCP server for authorized tool interoperability.
- Plugin/adapter contract for extending capabilities.
- CI integration for validation and evidence ingestion.
- IDE and desktop integrations as later adapters.

### 15.2 Contract rules

- Reuse shared domain schemas.
- Version public contracts.
- Validate untrusted inputs at every boundary.
- Use typed error envelopes.
- Include request/correlation IDs.
- Keep idempotency support for retryable commands.
- Never expose provider credentials or raw session data through UI/API responses.
- Do not create separate UI-only state machines for domain entities.

---

## 16. Operations and deployment

### 16.1 Local development

A developer installation should provide:
- preflight checks for Node/pnpm/runtime dependencies;
- one documented way to configure a project root;
- clear local data directory and backup location;
- local health/readiness endpoints;
- deterministic offline tests with fake providers;
- clear start/stop and log commands.

### 16.2 Container target

Docker/Compose is a packaging target, not an assumption that the current app is already production container-ready.

Target requirements:
- non-root runtime user;
- explicit persistent volume mapping;
- health and readiness checks;
- secrets supplied through approved environment/secret mechanisms;
- network exposure disabled unless configured;
- graceful shutdown;
- versioned migrations;
- tested backup/restore and rollback.

### 16.3 Reliability targets

- Restart does not lose committed task/event state.
- Worker crash does not create duplicate committed side effects.
- A stale lease can be reclaimed safely.
- Provider failure does not corrupt task state.
- Disk exhaustion is surfaced before data loss.
- Backups have checksums and restore tests.
- Logs are structured, correlated, and redacted.
- Metrics can be disabled or kept local by policy.

---

## 17. Non-functional requirements

| Area | Target |
|---|---|
| Security | Zero known unauthorized tool actions and zero secret leakage in release gates |
| Reliability | Durable task/job/event state and crash recovery tests |
| Performance | Bounded queue, provider, and context retrieval latency measured under representative load |
| Resource use | Concurrency, token, time, output, and disk budgets are enforceable |
| Portability | Supported Node/OS matrix passes clean install/build/test |
| Accessibility | Keyboard-operable workflows, semantic labels, visible focus, reduced-motion support |
| Observability | Correlation IDs across mission/task/job/run/tool/evidence |
| Privacy | Explicit provider egress, local-only enforcement, no hidden telemetry |
| Extensibility | Versioned contracts and reusable adapter contract tests |
| Maintainability | Small tasks, bounded modules, low duplication, generated artifacts excluded |

Targets should be converted into measurable thresholds only after baseline measurements exist.

---

## 18. Roadmap and traceability

The detailed task list is [todo-v2.md](./todo-v2.md). The phase mapping is:

| Blueprint capability | Backlog phase |
|---|---|
| Truthful baseline and reconciliation | M00 |
| Repository identity and hygiene | M01 |
| Shared domain contracts | M02 |
| CI and quality gates | M03 |
| Security and permissions | M04 |
| Task/job/event/persistence | M05 |
| Planner and scheduler | M06 |
| Execution runtime and adapters | M07 |
| Proof Engine and evidence graph | M08 |
| Provider intelligence and routing | M09 |
| Repo Atlas | M10 |
| Scoped memory | M11 |
| War Room and UX | M12 |
| Plugins, MCP, SDK, WebSocket, OpenAPI | M13 |
| Operations and recovery | M14 |
| Benchmarks and acceptance | M15 |

### 18.1 Implementation order

Stabilize repository identity and CI first. Then establish contracts, security, durable task lifecycle, and proof. Only after those gates are credible should the system expand agent parallelism, model routing, repository intelligence, UI, and integrations.

Do not build all target planes in one large commit. Use one micro-task or a small dependency-related batch per commit.

---

## 19. Product acceptance and benchmark design

### 19.1 Benchmark dimensions

- Repository navigation and context retrieval.
- Bug fixing with pre-existing regression tests.
- Test authoring.
- Small feature implementation.
- Refactoring with behavior preservation.
- Documentation and API contract updates.
- Security regression repair.
- Long-horizon mission execution and recovery.

### 19.2 Fair comparison

A competitive run must record:
- same repository revision;
- same task prompt and acceptance criteria;
- model/provider and version;
- tool and network permissions;
- token/time/cost budget;
- number of retries and agents;
- independent evaluator;
- final commit and evidence.

### 19.3 Core metrics

1. Verified solve rate.
2. Regression rate.
3. Time to verified change.
4. Cost per accepted change.
5. Human intervention count, separating routine from authority-required.
6. Repo Atlas precision@k and freshness.
7. Recovery success after simulated crash.
8. Merge conflict rate and parallel efficiency.
9. Provider/tool failure rate.
10. Unauthorized action and secret-leak count.

No public superiority claim should be made until results are reproducible and independently checked.

---

## 20. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Backlog claims completion without evidence | Evidence-linked task status and commit/CI SHA |
| Agents collide in shared checkout | One writer per isolated worktree |
| Provider fallback violates privacy | Explicit egress class and local-only contract tests |
| Large plans overwhelm small agents | Atomic task validator and bounded planner output |
| Model routing optimizes cost but reduces quality | Verified task outcomes and minimum sample size |
| UI invents state | Server-owned lifecycle and event reconciliation |
| Plugins escalate permissions | Manifest validation and least privilege |
| Context index leaks secrets | Sensitive-path exclusion and secret scans |
| Long-running jobs are lost on restart | Durable state, leases, checkpoints, idempotency |
| Marketing promises exceed implementation | Current-state table and benchmark-based claims |

---

## 21. Definition of product success

Rocksoul DX may claim the target operating-system capability only when a real mission can:
1. accept a goal and project scope;
2. inspect the repository and create a validated micro-task plan;
3. schedule multiple compatible adapters in isolated worktrees;
4. select providers under capability, quality, quota, privacy, and budget policy;
5. execute tools with least privilege;
6. resume after worker/process interruption;
7. independently verify each change;
8. produce an evidence graph from goal through commit and CI;
9. show truthful mission/agent/provider/evidence state in the War Room;
10. proceed without routine human confirmations while respecting explicit authority boundaries.

The final measure is not agent count or animated progress. It is more accepted engineering work, backed by evidence, with fewer regressions, lower unnecessary cost, reliable recovery, and no unauthorized actions.

---

## 22. Document governance

- This blueprint defines product intent and target architecture.
- `todo-v2.md` defines executable work and task status.
- Source code, tests, CI, and persisted evidence define what is actually implemented.
- Older architecture notes are useful historical context but must be reconciled against current source.
- When implementation changes a contract or product boundary, update this blueprint and the relevant tests.
- Do not mark target features as available based only on this document.

**Build bigger. Verify everything. Keep humans in control of the boundaries.**
