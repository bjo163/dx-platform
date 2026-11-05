# Rocksoul DX — Autonomous Developer Operating System

> **One goal. Many agents. Any model. Verified outcomes.**

Rocksoul DX (repository: **DX Platform**) is an open-source, local-first platform for coordinating AI-assisted software engineering. It is being designed to turn a development goal into small, testable tasks; route those tasks to the right execution engine; isolate changes; verify results independently; and preserve an evidence trail from requirement to commit.

It is intended to bring together capabilities commonly spread across coding agents, agent-workforce managers, model/provider gateways, repository-intelligence tools, and engineering operations.

> [!IMPORTANT]
> **Project status: active development. Not production-ready.** The repository contains working foundations, partial integrations, and planned capabilities. A package or UI screen existing in the tree does not mean its end-to-end behavior is complete. See the implementation snapshot below and the [product blueprint](./blueprint.md).

---

## The product in one view

Rocksoul DX is not intended to be another foundation model or a clone of one coding assistant. It is the **system around the models**: the control plane, orchestration, execution, context, verification, and operations needed to deliver dependable engineering outcomes.

- **Plan:** turn goals into bounded micro-tasks with dependencies and acceptance criteria.
- **Orchestrate:** schedule work, manage budgets, leases, retries, checkpoints, and parallel execution.
- **Execute:** use the native runtime, local models, browser-based providers, and compatible agent adapters.
- **Understand:** build an incremental map of the repository and retrieve relevant context.
- **Verify:** run independent checks and attach evidence to every claimed result.
- **Operate:** observe missions, agents, providers, approvals, and system health in one War Room.

## Product principles

1. **Proof over claims.** An agent cannot mark its own work as verified. Verification requires independent evidence.
2. **Small tasks, fast feedback.** Work should be decomposed so that smaller/less expensive agents can execute bounded tasks safely.
3. **Local-first, privacy-honest.** The workspace, orchestration, index, and persistence can run locally. A remote AI provider still receives the prompt/context sent to it.
4. **No silent cloud fallback.** A request marked local-only must never be routed to a cloud provider without an explicit policy change.
5. **Model-agnostic.** Models and coding agents are interchangeable adapters behind stable contracts.
6. **Least privilege.** Filesystem, process, browser, network, and secret access must be separately scoped.
7. **One source of truth.** The task/job store is authoritative; dashboards and live streams are projections.
8. **Reuse before expansion.** Existing packages and contracts must be audited before new packages or duplicate implementations are created.
9. **Evidence before merge.** A change needs an inspectable diff, relevant checks, and traceability to its commit and CI result.
10. **No fake completeness.** Stubs, mocks, generated files, and documentation are not proof of production behavior.

---

## Current repository snapshot

The table describes the repository baseline inspected on **November 5, 2026**. It is a source-level snapshot, not a production-readiness certification. The local audit may update these findings; reconcile changes against the source and tests before changing a status.

| Area | What is present in the repository | Current confidence |
|---|---|---|
| CLI | TypeScript CLI package and executable entry point | Foundation present; package identity and CI contract need reconciliation |
| API | Fastify application and job/provider/workspace routes | Foundation present; authentication and contract coverage need hardening |
| Web War Room | Next.js/React application | Foundation present; dashboard needs domain-driven integration and verification |
| Browser providers | Browser-session adapters and provider registry | Initial integrations present; provider-specific behavior needs contract tests |
| Agent runtime | Runtime and tool orchestration code | Foundation present; durable orchestration and adapter contract need validation |
| Jobs | Job store/runner and lifecycle-related code | Foundation present; end-to-end recovery/idempotency need proof |
| Policy | Permission and path-guard implementation | Foundation present; cross-platform security regression coverage required |
| Persistence | PGlite/database package and API integration | Foundation present; migration/backup/restore acceptance required |
| Sessions | Session and transcript implementation | Foundation present; retention, provenance, and secret-redaction checks required |
| SDK | Package exists | Partial; public client behavior must be verified against the live API |
| Local model support | Ollama/LM Studio helper code | Partial; process invocation and network boundaries need hardening |
| Plugins | Plugin manifest/registry foundations | Partial; permissions, isolation, and lifecycle need proof |
| WebSocket server | Package source exists | Partial; workspace integration, auth, and event contract need proof |
| Config API | Package source exists | Partial; endpoint and application integration need proof |
| OpenAPI | Package/source skeleton exists | Skeleton; route discovery and generated contract need implementation |
| Observability | Basic metrics foundations exist | Partial/skeleton; production-grade instrumentation is not established |

### Known integration work

The current backlog identifies inconsistencies that must be resolved before calling the project stable: package naming and filters, TypeScript project references, workspace/test configuration, lockfile ownership, environment-variable naming, generated build artifacts, API integration coverage, and security boundaries.

The latest baseline also showed a mismatch between the package identities and CI selectors. Treat CI as **not yet certified green** until a successful run is attached to the exact commit being evaluated. Do not infer success from a local build or from a commit message.

### Running quality gates locally

The repository includes a local quality-gate script at `scripts/quality-gate.mjs` that runs the same verification steps as CI:

```bash
pnpm exec node scripts/quality-gate.mjs
```

This script verifies:

1. **Fresh install** with frozen lockfile - ensures no stale dependencies
2. **Build workspace** - compiles all packages from source
3. **Build API** - compiles the API package
4. **Build web app** - compiles the web application
5. **Smoke-test CLI** - verifies the CLI binary executes correctly
6. **Pack dry-run** - confirms the packed tarball contains no cache or private paths
7. **TypeScript check** - runs `pnpm check` across all solution references
8. **Test suite** - runs the full test suite (unit + browser lanes)

If any gate fails, the script exits with a non-zero code. Review the output to diagnose and fix the issue before re-running.

For individual gate verification, the CI workflow steps are available in `.github/workflows/ci.yml`.

---

## Target architecture

The product is organized into six logical planes. These are responsibility boundaries, **not instructions to create six new packages**.

| Plane | Responsibility | Key outcomes |
|---|---|---|
| **Control Plane** | Projects, missions, task trees, budgets, approvals, user intent | One place to direct and supervise work |
| **Orchestration Plane** | DAG planning, dependency scheduling, queues, leases, retries, checkpoints | Long-running work that can resume safely |
| **Execution Plane** | Native runtime, agent adapters, tools, isolated worktrees/containers | Parallel work without shared-checkout collisions |
| **Intelligence Plane** | Provider/model registry, capability matching, routing, quota and health | The right engine for each task and policy |
| **Knowledge & Proof Plane** | Repo Atlas, scoped memory, independent verification, evidence graph | Relevant context and provable results |
| **Governance & Operations Plane** | Permissions, secrets, audit, persistence, observability, recovery, releases | Safe and operable autonomous workflows |

### Typical mission lifecycle

1. A user or approved automation submits a goal and selects a project/workspace.
2. The platform inspects repository state and prepares a plan of bounded tasks.
3. The plan validator checks dependencies, scope, budgets, and acceptance criteria.
4. The scheduler selects READY tasks and assigns a compatible agent/runtime.
5. Each writer receives an isolated task worktree and scoped tool permissions.
6. The agent performs the task and records tool calls, diffs, and artifacts.
7. An independent verifier runs the checks selected for the change type.
8. Failed checks return a bounded repair task; unresolved results remain unverified.
9. A verified change becomes eligible for review/merge according to repository policy.
10. The evidence graph links the goal, tasks, run, diff, checks, commit, and CI result.

Simple tasks should use one agent plus a verifier. Multi-agent coordination is reserved for work where parallelism or independent review provides measurable value.

---

## Core differentiators

### Proof Engine

A task is not complete because an agent says “done.” The platform should store the exact checks, commands, exit codes, timestamps, commit SHA, CI run, and artifact digests used to verify the result. Outcomes must distinguish **pass**, **fail**, **skipped**, and **inconclusive**.

### Repo Atlas

An incremental, privacy-aware map of the codebase: files, symbols, imports, exports, workspace dependencies, tests, and change impact. The index must respect ignore rules, exclude sensitive paths by default, track its source revision, and show when its information is stale.

### Isolated agent fleet

Each writing agent works in a task-scoped worktree or sandbox. A single worktree has one writer at a time. Other agents may scout or review read-only. A merge/integration step reconciles the resulting diffs.

### Quality-aware model router

Routing considers task category, required capabilities, verified outcomes, context budget, latency, quota, cost, health, and privacy. No provider is selected only because it is free or currently available. Local-only requests never silently fall back to a remote provider.

### Autonomous, not uncontrolled

Routine engineering decisions should not require a human prompt. Agents can select a small implementation, add tests, update docs, retry bounded transient failures, and continue independent tasks. External publication, production deployment, destructive data changes, credential changes, payment, and privilege expansion remain behind explicit authorization.

---

## Privacy and security

**Local-first does not mean every model interaction is offline.** The platform may run its workspace, runtime, queue, index, and database locally, while a browser-based or API-based provider processes content sent to its service. Users must be shown which provider receives a request and which data classes may leave the machine.

Security requirements include:

- Local-only routing policy with a tested zero-outbound guarantee.
- Scoped filesystem access and path traversal/symlink protection.
- Process execution through argument arrays, with time, output, and cancellation limits.
- Redaction of cookies, tokens, authorization headers, and sensitive query parameters.
- Authentication and authorization for remote API, WebSocket, and MCP access.
- Explicit plugin capabilities and least-privilege permissions.
- Durable audit events for allowed, denied, and approved actions.
- No secret-bearing prompts, logs, test fixtures, screenshots, or artifacts in Git.

These are target requirements; the implementation must be verified against them.

---

## Repository map

| Path | Responsibility |
|---|---|
| `apps/api` | Fastify API application |
| `apps/web` | Next.js/React War Room |
| `packages/cli` | Developer CLI |
| `packages/runtime` | Agent execution/runtime foundations |
| `packages/job` | Job lifecycle and worker foundations |
| `packages/gateway` | Provider gateway foundations |
| `packages/browser` | Browser-session provider integrations |
| `packages/tools` | Filesystem/process/search tool foundations |
| `packages/policy` | Permission and path policy |
| `packages/protocol` | Shared protocol contracts |
| `packages/types` / `packages/shared` | Shared types and utilities |
| `packages/database` | Persistence and migrations |
| `packages/session` | Sessions and transcripts |
| `packages/artifacts` | Artifact handling |
| `packages/sdk`, `packages/mcp` | Integration surfaces |
| `packages/plugins`, `packages/local`, `packages/ws-server`, `packages/openapi`, `packages/observability`, `packages/config-api` | Extension and supporting capabilities under integration/verification |

The exact dependency graph and package scope are being reconciled. Check each package manifest before relying on a package name or import path.

---

## Development

### Requirements

- Node.js version compatible with the root `engines` declaration.
- pnpm version compatible with the root `packageManager` declaration (the repository baseline specifies pnpm 10.33.4).
- Git.

### Bootstrap and local checks

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm check
```

The repository is under active integration work. Some commands or package selectors may fail until the corresponding backlog items are resolved. Report the actual exit code; do not mark the project green based on an incomplete command.

The root development script is intended to start the API and web applications:

```bash
pnpm dev
```

Do not expose the API beyond localhost unless authentication, CORS, and deployment policy have been configured and tested.

---

## Roadmap

The executable, granular backlog is **[todo-v2.md](./todo-v2.md)**. It is the canonical task list; the older `todo.md` is retained as historical reference and must not be executed in parallel.

| Stage | Focus | Exit condition |
|---|---|---|
| M00–M03 | Re-baseline, repository identity, contracts, CI | Trustworthy baseline and reproducible quality gates |
| M04–M05 | Security, task/job/event/persistence | Safe boundaries and consistent durable state |
| M06–M08 | Orchestration, adapters, Proof Engine | Recoverable execution with independent evidence |
| M09–M11 | Provider routing, Repo Atlas, memory | Context-aware and policy-aware intelligence |
| M12–M14 | Mission Control, integrations, operations | Usable and operable end-to-end platform |
| M15 | Benchmarks and acceptance | Reproducible evidence of product capability |

### How we measure success

- Verified solve rate on fixed repository/task sets.
- Regression rate and security regression count.
- Time to verified change, not time to first response.
- Cost and token usage per accepted change.
- Repo Atlas retrieval precision and index freshness.
- Recovery success after worker/process interruption.
- Parallel execution efficiency and merge conflict rate.
- Unnecessary human interventions and notification volume.
- Unauthorized actions and secret leaks: target **zero**.

Claims that Rocksoul DX is “better than” another product require comparable task sets, model/tool budgets, repository revisions, and independent evaluators.

---

## Documentation

- **[Product & architecture blueprint](./blueprint.md)** — vision, architecture, domain model, workflows, security, UX, and acceptance criteria.
- **[Autonomous execution backlog v2](./todo-v2.md)** — 435 small, independently verifiable tasks.
- **[Legacy backlog](./todo.md)** — retained for traceability; not the active execution queue.
- **[Architecture notes](./ARCHITECTURE.md)** — existing implementation notes; reconcile against source before treating older diagrams or endpoint tables as current.

## Contribution and autonomous execution

- Read `todo-v2.md` and select the earliest dependency-ready task.
- Inspect the bounded scope and existing implementation before editing.
- Prefer one small diff and one focused commit per task.
- Add regression tests for behavior changes; never weaken tests to make CI pass.
- Keep agent writers isolated by worktree; do not let multiple agents write the same checkout.
- Record task ID, changed files, exact checks, exit codes, commit SHA, and CI SHA.
- Continue without human confirmation for routine, reversible engineering decisions.
- Stop only for actions requiring external authorization or a genuine safety boundary; continue independent offline work.

---

**Rocksoul DX — Build bigger. Verify everything. Keep humans in control of the boundaries.**
