```
     ____  _   __ ____  ____  _       _      _____ _____ ____  _____ __  __ 
    |  _ \| | / // __ \|  _ \| |     / \    |_   _|  ___/ __ \|  ___/  \/  \
    | | | | |/ / |  __/| |_| | |    / _ \     | | | |_ | |  | | |_ | (_  _) |
    | |_| |   <  | |   |  __/| |   / ___ \    | | |  _|| |__| |  _| | | | |  
    |____/|_|\_\ |_|   |_|   |_|  /_/   \_\   |_| |_|   \____/|_|   |_| |_|  
                                                                               
                          [ D X - P L A T F O R M   v1.0.3 ]
```

> `>_ EXECUTE: ACTIVATE_DX_PLATFORM --mode=DEVELOPER_EXPERIENCE --target=VELOCITY`

## `[SYSTEM_BOOT:DX-PLATFORM://CORE]`

**DEVELOPER EXPERIENCE AT LIGHT SPEED. LOCAL. SOVEREIGN. YOURS.**

DX-Platform is a local-first, agentic AI gateway engineered to supercharge your development workflow by unifying every web-based LLM subscription you already own into one integrated, autonomous developer experience platform. 

It's not a chatbot. It's not an IDE plugin. It's an **autonomous developer platform** built to automate your entire workflow—think, plan, build, debug, test and ship—all coordinated by multiple AI agents.

All running on your machine. All under your complete control.

## `[DIRECTIVE_01: DEVELOPER_SOVEREIGNTY]`

In a world drowning in SaaS subscriptions, rate limits, and telemetry, DX-Platform returns control back to you.

Using session-based authentication, it bridges your existing LLM accounts (ChatGPT, Claude, etc.) into a unified **DEVELOPER GATEWAY**. Your code stays local. Your data stays yours. Your workflow is autonomous. No API keys. No cloud proxies. No telemetry.

## `[AGENT_MESH: MULTI_MODEL_ORCHESTRATION]`

The era of single-model limitation is over. Meet coordinated multi-agent workflows.

- **`AGENT.SPAWN`** - Deploy specialized agents for different tasks: code review, testing, documentation, security audit. All working in parallel.
- **`MODEL.ROUTING`** - Intelligent routing based on task complexity, reasoning requirements, and latency. Simple fixes go to fast models. Complex architecture goes to reasoning models.
- **`AGENT.PIPELINE`** - Chained workflows where output from one agent feeds input to the next. Code written → Tested → Reviewed → Documented automatically.
- **`CONSENSUS.EXEC`** - Run the same task across multiple models in parallel. Compare results and select the best implementation.
- **`CONCURRENT.OPS`** - Execute multiple missions simultaneously across different providers without blocking.
- **`ADAPTIVE.ESCALATION`** - Automatically escalate to more capable models when task complexity exceeds threshold.

## `[PROVIDER_GATEWAY: UNIFIED_LLM_ACCESS]`

DX-Platform functions as your **local AI provider gateway**. One interface. All your subscriptions. Seamless orchestration.

- **`UNIFIED.ROUTING`** - Single API endpoint to route requests to any connected provider (ChatGPT, Claude, Gemini, etc.).
- **`SESSION.PERSISTENCE`** - Login to each provider once via browser. Sessions stay authenticated. No API key juggling.
- **`FAILOVER.AUTOMATIC`** - Provider fails? Automatically route to backup provider without interrupting your workflow.
- **`LOAD.DISTRIBUTION`** - Spread requests across providers to maximize throughput and avoid rate limits.
- **`PROVIDER.SWITCHING`** - Switch providers mid-task without losing context or conversation history.
- **`HEALTH.DASHBOARD`** - Real-time view of all connected providers, their auth status, and availability.

## `[CONTROL_CENTER: DEVELOPER_DASHBOARD]`

A clean, efficient interface engineered for developers who value signal over noise.

- **`CLEAN.UI`** - Minimal, focused design with terminal-like aesthetics. Maximum information density without clutter.
- **`CHAT.INTERFACE`** - Natural language task input with real-time agent activity visibility.
- **`JOB.MONITOR`** - Live dashboard showing job progress, tool execution, file changes, and timing.
- **`QUEUE.MANAGER`** - Visual job queue. Easily prioritize, pause, resume, or cancel tasks.
- **`MULTI.WORKSPACE`** - Work on multiple projects simultaneously with isolated contexts.
- **`FOCUS.VIEW`** - Distraction-free mode showing only code changes and agent output.

## `[CODEBASE_INTELLIGENCE: SEMANTIC_ANALYSIS]`

DX-Platform understands your entire codebase, not just individual files.

- **`SEMANTIC.GRAPH`** - Builds a living map of your codebase: all modules, imports, exports, dependencies. Updated in real-time.
- **`CROSS_FILE.REASONING`** - Agents understand relationships across files. They can trace call chains, follow data flow, and understand coupling without manual context.
- **`IMPACT.ANALYSIS`** - Before making changes, know exactly what will be affected. See dependencies, breaking changes, and side effects upfront.
- **`SMART.CONTEXT`** - Only feeds agents the code they need. Removes noise, maximizes signal, fits within context windows.
- **`CODE.SEARCH`** - Fast semantic search. Find symbols, usage patterns, or related code instantly.
- **`GIT.AWARENESS`** - Full git integration: staged changes, branch context, history. Agents understand the version control state.

## `[EXECUTION_ENGINE: SAFE_AUTOMATION]`

From task to production code with full visibility and control.

- **`DIFF.REVIEW`** - Side-by-side or unified diff view. Accept/reject changes hunk-by-hunk. Re-run if needed.
- **`TOOL.VISIBILITY`** - Every tool invocation is visible. See file reads, writes, searches, terminal commands in real-time.
- **`POLICY.CONTROL`** - Define what agents can access and modify. Restrict by file pattern, path, or action type.
- **`APPROVAL.GATE`** - Require human approval for sensitive operations: file deletion, bulk changes, external commands.
- **`WORKSPACE.BOUNDS`** - Agents are strictly confined to your project root. No escape outside defined boundaries.
- **`AUDIT.LOG`** - Complete immutable log of all operations. Who did what, when, and why. Built-in for compliance.
- **`SAFE.EXECUTION`** - Sandboxed execution with safety nets. Power without recklessness.

## `[EXTENSION_PROTOCOL: MODULAR_FURY]`

NeuralForge is a platform. Mold it to your doctrine.

### Plugin System

```typescript
// Create a custom plugin at: plugins/my-plugin.ts
export const MyPlugin = {
  id: "my-plugin",
  name: "My Custom Plugin",
  version: "1.0.0",
  capabilities: ["repository.read", "code.analyze"],
  
  async execute(context: PluginContext, args: any) {
    // Access orchestrator, tools, router
    const result = await context.jobService.createJob({
      task: "analyze this code",
      provider: "chatgpt",
    });
    return result;
  },
};
```

### Custom Slash Commands

```bash
# Define in .kiro/hooks/custom-commands.json
/code-review          # Trigger code review agent
/security-audit       # Run security policy check
/generate-tests       # Auto-generate unit tests
/migrate-db           # Database migration helper
```

### Templates & Battle Plans

Pre-built templates available:
- **Migration**: Move codebase from one pattern to another
- **Testing**: Generate unit & integration tests
- **API Scaffolding**: Auto-generate REST/GraphQL endpoints
- **Component Libraries**: React, Vue, Svelte component generation
- **Security Audit**: Vulnerability scanning
- **CI/CD Config**: GitHub Actions, GitLab CI setup

### Custom Agent Personas

```typescript
// .kiro/agents/security-auditor.json
{
  "name": "Security Auditor",
  "systemPrompt": "You are a security-focused code reviewer...",
  "tools": ["fs.read", "fs.search", "terminal.exec"],
  "providers": ["chatgpt", "claude"],
  "routing": {
    "complexity": "high",  // Route to heavy model
    "timeout": 600000,     // 10 min timeout
  }
}
```

### Event-Driven Hooks

```bash
# Automatically run on events
PostJobComplete    → Run tests
PostFileSave       → Run linter
PreApproval        → Security scan
PostProviderSwitch → Notify team
```

### SDK for External Integration

```typescript
// npm install @neuralforge/sdk
import { NeuralForgeSDK } from "@neuralforge/sdk";

const nf = new NeuralForgeSDK({ 
  apiUrl: "http://localhost:8080" 
});

// Create job from external app
const job = await nf.jobs.create({
  task: "summarize this file",
  provider: "claude",
  projectId: "my-project",
});

// Subscribe to updates
nf.jobs.subscribe(job.id, (status) => {
  console.log(`Job ${job.id}: ${status.status}`);
});
```

## `[API_REFERENCE]`

NeuralForge exposes a REST API for job orchestration, provider management, and workspace access.

### Core Endpoints

**Jobs API**
```bash
# Create a new job
POST /v1/jobs
{
  "task": "Create hello.js and run it",
  "provider": "chatgpt",
  "projectId": "default"
}

# List all jobs
GET /v1/jobs

# Get job details
GET /v1/jobs/:id

# Get job status (real-time)
GET /v1/jobs/:id/status

# Stream job events (SSE)
GET /v1/jobs/:id/events

# Cancel job
POST /v1/jobs/:id/cancel

# Retry failed job
POST /v1/jobs/:id/retry

# Get job logs
GET /v1/jobs/:id/logs
```

**Providers API**
```bash
# List available providers
GET /v1/providers

# Initiate provider login
POST /v1/providers/:id/login

# Verify provider authentication
POST /v1/providers/:id/verify

# Disconnect provider
DELETE /v1/providers/:id
```

**Workspace API**
```bash
# Get workspace info
GET /v1/workspace

# List files in directory
GET /v1/workspace/files?path=src/

# Read file contents
GET /v1/workspace/file?path=src/app.ts
```

**Health & Status**
```bash
# API health check
GET /health

# Job pool status
GET /v1/jobs/pool/status
```

### Example: Create & Monitor a Job

```bash
# 1. Create job
JOB_ID=$(curl -X POST http://localhost:8080/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create a test file",
    "provider": "chatgpt"
  }' | jq -r '.jobId')

echo "Job created: $JOB_ID"

# 2. Poll status
curl http://localhost:8080/v1/jobs/$JOB_ID/status | jq .

# 3. Stream events (SSE)
curl http://localhost:8080/v1/jobs/$JOB_ID/events

# 4. Get final logs
curl http://localhost:8080/v1/jobs/$JOB_ID/logs | jq .
```

### SDK Usage

```typescript
import { NeuralForgeSDK } from "@neuralforge/sdk";

const nf = new NeuralForgeSDK({
  apiUrl: "http://localhost:8080"
});

// Create & execute job
const job = await nf.jobs.create({
  task: "Analyze this codebase",
  provider: "claude",
  projectId: "my-project"
});

// Monitor progress
nf.jobs.subscribe(job.id, (status) => {
  console.log(`[${job.id}] ${status.status}`);
  if (status.result) console.log("Result:", status.result.message);
});

// Get full history
const logs = await nf.jobs.getLogs(job.id);
console.log(logs.activity);
```

For full API docs → see [`./ARCHITECTURE.md`](./ARCHITECTURE.md#api-endpoints-reference)

---

Built with zero-compromise tech for maximum performance, minimal overhead and absolute local control.

| COMPONENT | TECHNOLOGY | PURPOSE |
| --- | --- | --- |
| **WAR ROOM UI** | `Next.js 15` + `React 19` + `TypeSocketDX` | Brutalist, responsive command center with real-time updates |
| **GATEWAY CORE** | `Fastify` + `TypeScript` | Lightning-fast local API + agentic gateway router |
| **AGENTIC MESH** | `Custom Orchestrator` | Multi-agent runtime, pipeline chaining, swarm consensus & routing logic |
| **BROWSER BRIDGE** | `Playwright` | Session-based auth & provider interaction without API keys |
| **LOCAL VAULT** | `PGlite` (Postgres-in-WASM) | Blazing-fast embedded DB for jobs, sessions, agents, audit logs & history |
| **JOB ENGINE** | `Async Queue + EventBus` | Fire-and-forget orchestration with live telemetry & failure recovery |
| **POLICY KERNEL** | `Custom Rule Engine` | Granular permissions, HITL, sandboxing & action gating |
| **PLUGIN VM** | `Sandboxed Runtime` | Safe, isolated execution for custom extensions |
| **WEBSOCKET LAYER** | `ws` + Custom Event Streams | Real-time swarm telemetry down to the wire |
| [# PR TITLE HERE] | Click to edit & save title | Click to edit description |

## `[ARCHITECTURE_OVERVIEW]`

NeuralForge runs as a **distributed mesh** with local-first guarantees.

```
┌─────────────────────────────────────────────┐
│         User's Machine (Sovereign)          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    War Room (Next.js + React)       │   │
│  │    localhost:3000                   │   │
│  │  - Job creation & monitoring        │   │
│  │  - Provider management              │   │
│  │  - File browser & preview           │   │
│  │  - Real-time job updates (SSE)      │   │
│  └──────────────────┬──────────────────┘   │
│                     │                       │
│  ┌──────────────────▼──────────────────┐   │
│  │    NeuralForge Gateway (Fastify)    │   │
│  │    localhost:8080                   │   │
│  │  - REST API for job management      │   │
│  │  - Provider session bridging        │   │
│  │  - Policy & approval engine         │   │
│  │  - Job queue & scheduling           │   │
│  └──────────────────┬──────────────────┘   │
│                     │                       │
│  ┌──────────────────▼──────────────────┐   │
│  │      Runtime Orchestrator            │   │
│  │  - Agent execution engine            │   │
│  │  - Tool system (fs, terminal, etc)   │   │
│  │  - Browser automation (CDP)          │   │
│  │  - Session management                │   │
│  └──────────────────┬──────────────────┘   │
│                     │                       │
│  ┌──────────────────▼──────────────────┐   │
│  │    Local Database (PGlite)           │   │
│  │    .neuralforge/data/                │   │
│  │  - Jobs, sessions, audit logs        │   │
│  │  - Provider credentials (encrypted)  │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
         ▲              ▲              ▲
         │              │              │
    ┌────┴─┐      ┌─────┴────┐    ┌───┴──┐
    │ChatGPT│      │  Claude  │    │Gemini│
    └───────┘      └──────────┘    └──────┘
    (Browser      (Browser         (Browser
     Session)      Session)         Session)
```

**Key Design Principles:**
- ✅ **100% Local** - No telemetry, no cloud sync, no data exfil
- ✅ **Session-Based Auth** - Use your real accounts via browser automation
- ✅ **Distributed Mesh** - Multiple agents, multiple providers, parallel execution
- ✅ **Policy-Driven** - All tool calls gated by approval engine
- ✅ **Fault Tolerant** - Job leases, timeouts, automatic failover

For deep technical details → see [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## `[ENVIRONMENT_VARIABLES]`

Configuration via environment variables. Defaults work for local dev.

### Required Variables
| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Execution environment |
| `PORT` | `8080` | API server port |
| `NEXT_PUBLIC_DX_PLATFORM_API_URL` | `http://localhost:8080` | Dashboard → API connection |

### Optional Variables
| Variable | Default | Purpose |
| --- | --- | --- |
| `DX_PLATFORM_HOST` | `127.0.0.1` | Bind address |
| `DX_PLATFORM_DATA_DIR` | `.dx-platform` | Database & sessions store |
| `DX_PLATFORM_PROJECT_ROOT` | `.` (current dir) | Workspace root for tasks |
| `DX_PLATFORM_PROVIDER` | `chatgpt` | Default provider |
| `DX_PLATFORM_JOB_TIMEOUT_MS` | `1800000` | Max job runtime (30 min) |
| `DX_PLATFORM_JOB_TTL_MS` | `86400000` | Job retention (24 hr) |
| `DX_PLATFORM_CHROME_PATH` | (auto-detect) | Chrome/Chromium path |
| `DX_PLATFORM_CORS_ORIGINS` | `localhost:3000,localhost:5173` | Allowed origins |
| `DX_PLATFORM_JWT_SECRET` | (optional) | For remote API binding |

### Setup Examples

**Local Development (Default)**
```bash
# Just run:
pnpm dev
# Everything defaults to localhost
```

**Production Deployment**
```bash
export NODE_ENV=production
export DX_PLATFORM_HOST=0.0.0.0
export DX_PLATFORM_JWT_SECRET=$(openssl rand -hex 32)
export DX_PLATFORM_CORS_ORIGINS="https://myapp.com"
export DX_PLATFORM_DATA_DIR=/data/dx-platform
export DX_PLATFORM_JOB_TIMEOUT_MS=3600000  # 1 hour

pnpm build
pnpm start
```

**Long-Running Tasks**
```bash
export DX_PLATFORM_JOB_TIMEOUT_MS=7200000  # 2 hours
export DX_PLATFORM_JOB_TTL_MS=604800000    # 7 days retention

pnpm dev
```

**Custom Chrome Path**
```bash
export DX_PLATFORM_CHROME_PATH=/usr/bin/chromium
# Useful for Docker, headless servers, WSL

pnpm dev
```

---

## `[TROUBLESHOOTING]`

### Common Issues

**Q: Port 3000 or 8080 already in use**
```bash
# Find process on port 3000
lsof -i :3000
# Kill it
kill -9 <PID>

# Or use different port
PORT=9090 pnpm dev
```

**Q: Chrome/Chromium not found**
```
Error: Could not locate Chrome/Chromium. Install Chrome or set NEURALFORGE_CHROME_PATH.
```

**Solution:**
```bash
# macOS
brew install chromium

# Ubuntu/Debian
sudo apt install chromium-browser

# Or point to existing install
export NEURALFORGE_CHROME_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
pnpm dev
```

**Q: Provider authentication fails**
```
Error: Provider "chatgpt" is not connected. Connect it from Providers.
```

**Solution:**
1. Open War Room → Providers tab
2. Click **Connect** next to your provider
3. Wait for browser popup
4. Login to ChatGPT/Claude/Gemini in the popup
5. Return to war room → Browser auto-closes
6. Status should show "Connected"

If still failing:
```bash
# Clear provider cache
rm -rf .neuralforge/profiles/*

# Restart
pnpm dev
```

**Q: TypeScript errors on `pnpm check`**
```
error TS2307: Cannot find module '@neuralforge/shared/errors'
```

**Solution:**
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm check
```

**Q: Job times out but should take longer**
```
Error: The provider did not complete before the request timeout.
```

**Solution:**
```bash
# Increase timeout
export NEURALFORGE_JOB_TIMEOUT_MS=3600000  # 1 hour instead of 30 min
pnpm dev
```

**Q: Database corrupted after crash**
```
Error: database disk image is malformed
```

**Solution:**
```bash
# Backup and delete corrupted DB
mv .neuralforge .neuralforge.backup
# Restart (new DB will be created)
pnpm dev
```

**Q: Web UI won't connect to API**
```
Error: Cannot reach NeuralForge API at http://localhost:8080
```

**Solution:**
1. Verify both servers running: `pnpm dev`
2. Check API health: `curl http://localhost:8080/health`
3. If API not responding, check for errors in terminal
4. Verify `NEXT_PUBLIC_NEURALFORGE_API_URL` in `.env.local`

**Q: Job gets stuck in "pending" status**

**Solution:**
```bash
# Check job worker health
curl http://localhost:8080/v1/jobs/pool/status

# If workers are 0, API may be stalled
# Restart:
pnpm dev
```

### Getting Help

1. **Check logs** - Look at terminal output for error messages
2. **Run diagnostics** - `pnpm run doctor`
3. **View activity log** - War room → Jobs → [job] → Activity tab
4. **Check docs** - `./ARCHITECTURE.md` or `./docs/BRANDING.md`
5. **Report issue** - GitHub issues with output from `pnpm run doctor`

---

| FEATURE | API-TOOLS | CURSOR | WINDSURF | COPILOT | **NEURALFORGE** |
| --- | --- | --- | --- | --- | --- |
| **NO API KEYS** | NO | NO | NO | NO | **YES** |
| **MULTI-AGENT MESH** | NO | LIMITED | LIMITED | NO | **YES - FULL PLATOON** |
| **AGENTIC GATEWAY ROUTER** | NO | NO | NO | NO | **YES - UNIFIED ROUTING** |
| **LOCAL FIRST & ZERO TELEMETRY** | NO | MIXED | MIXED | MIXED | **YES - 100% LOCAL** |
| **SWARM CONSENSUS / DUEL** | NO | NO | NO | NO | **YES** |
| **HOLOMAP / CROSS-FILE COGNITION** | LIMITED | GOOD | GOOD | PARTIAL | **EXCEPTIONAL** |
| **POLICY ENGINE + HITL** | WEAK | WEAK | WEAK | WEAK | **HARDCORE** |
| **FAILOVER CASCADE** | NO | NO | NO | NO | **YES** |
| **BROWSER SESSION BASED** | NO | NO | NO | NO | **YES** |

## `[QUICK_START: 30_SECONDS]`

Want to activate DX-Platform RIGHT NOW? 

```bash
# Clone & setup (60 seconds)
git clone https://github.com/bjo163/dx-platform.git
cd dx-platform
pnpm install

# Verify prerequisites
pnpm check

# Launch the platform
pnpm dev
```

**Then:**
1. Open `http://localhost:3000` → Developer Dashboard
2. Go to Providers tab → Connect ChatGPT, Claude, or your LLM
3. Describe a development task → Watch autonomous execution

**That's it.** You're now running a local autonomous developer platform with zero cloud dependencies.

---

# [DEPLOYMENT_GUIDE]

### Prerequisites
- **Node.js**: v20.17+ or v22.13+ or v23.5+
- **pnpm**: v9.0.0+
- **Chrome/Chromium**: For browser automation (auto-discovered)
- **Disk space**: ~500MB for node_modules + cache

### Installation Steps

```bash
# [01] CLONE THE REPOSITORY
git clone https://github.com/bjo163/dx-platform.git
cd dx-platform

# [02] VERIFY ENVIRONMENT
node --version  # Should be v20.17+
pnpm --version  # Should be v9.0.0+

# [03] INSTALL DEPENDENCIES
pnpm install

# [04] TYPECHECK
pnpm check

# [05] BUILD
pnpm build

# [06] VERIFY BUILD
pnpm run doctor

# [07] START DEVELOPMENT SERVER
pnpm dev

# [08] ACCESS THE PLATFORM
# Dashboard:  http://localhost:3000
# API:        http://localhost:8080
# Health:     http://localhost:8080/health
```

### Verification Checklist
- [ ] `pnpm check` passes (TypeScript)
- [ ] `pnpm dev` starts both servers
- [ ] Dashboard loads at localhost:3000
- [ ] API responds at localhost:8080/health
- [ ] Providers page accessible

### Common Issues
| Problem | Solution |
| --- | --- |
| Port 3000/8080 in use | `lsof -i :3000` then kill process, or set PORT env var |
| Chrome not found | Install Chrome/Chromium or set `DX_PLATFORM_CHROME_PATH` |
| pnpm install fails | Delete node_modules, pnpm-lock.yaml, then retry |
| TypeScript errors | Run `pnpm clean && pnpm install && pnpm check` |

## `[TACTICAL_GUIDE]`

### Step-by-Step Workflow

#### 1️⃣ **BOOTSTRAP** - Fire up the platform
```bash
pnpm dev
# Wait for: 
# ✓ Dashboard running on localhost:3000
# ✓ API running on localhost:8080
# ✓ Job service initialized
```
Open browser → `http://localhost:3000`

#### 2️⃣ **CONNECT PROVIDERS** - Link your LLMs
1. Click **Providers** tab
2. For each provider (ChatGPT, Claude, Gemini, etc):
   - Click **Connect**
   - Browser auto-opens → Login to that service
   - Return to dashboard → Click **Verify**
   - Status shows "Connected" ✅

**Time**: ~2 min per provider

#### 3️⃣ **LOAD PROJECT** - Setup workspace
1. Dashboard automatically detects current project
2. Or click **Workspace** tab → see file browser
3. Semantic analysis runs automatically on codebase

**What you see**: File tree, recent jobs, provider health

#### 4️⃣ **SUBMIT TASK** - Describe your development goal
In the chat interface:
```
"Create a TypeScript utility for parsing JSON config files with validation"
```
1. Select provider (ChatGPT, Claude, etc)
2. Click **Execute**
3. Watch job queue up (status: pending)

**Time**: ~10 seconds to queue

#### 5️⃣ **MONITOR EXECUTION** - Watch autonomous workflow
The Job Dashboard shows:
- **Status**: pending → running → completed/failed
- **Provider**: Which AI is working
- **Activity Log**: Real-time tool calls, approvals, outputs
- **Live Updates**: Real-time progress

Controls:
- **Cancel**: Stop running job
- **Retry**: Requeue failed job
- **View Details**: See full activity log

#### 6️⃣ **REVIEW CHANGES** - Inspect generated code
Job completes → View results:
- **Output Panel**: Result summary
- **Files Tab**: See what was created/modified
- **Activity Log**: Full trace of every action

For file changes:
- Browse via Files tab
- Preview content inline
- Verify correctness

#### 7️⃣ **COMMIT & DEPLOY** - Push to production
If results are good:
```bash
git add .
git commit -m "feat: add new feature generated by DX-Platform"
git push origin main
```

**Repeat** from step 4️⃣ for next task

### Session Persistence
- Jobs persisted in `.neuralforge/data/`
- Can close dashboard → Reopen → See job history
- Use CLI mode to continue interrupted tasks

### Performance Tips
- Keep file browser closed when not needed (analysis runs continuously)
- Use Activity tab instead of live polling for finished jobs
- Set `DX_PLATFORM_JOB_TIMEOUT_MS=3600000` for long tasks (default: 30 min)

## `[MANIFESTO: FOR_THE_BRUTAL_BUILDER]`

> *"One man with an IDE can build a prototype. One builder with NeuralForge can wage war on an entire codebase and win."*

**Problem We Solve:**
- Juggling multiple LLM subscriptions (ChatGPT, Claude, Gemini, etc.)
- Manual context setup for each task
- No automation across your workflow
- Cloud dependencies and telemetry
- Single-model limitations

**DX-Platform Solution:**
- ✅ **Unified Interface** - Connect all LLMs in one place
- ✅ **100% Local** - Your code never leaves your machine
- ✅ **Autonomous Agents** - Multi-agent orchestration for specialized tasks
- ✅ **Zero Telemetry** - No tracking, no data exfil
- ✅ **Multi-Provider** - ChatGPT, Claude, Gemini, all working together
- ✅ **Session-Based** - Use your real accounts, no API keys
- ✅ **Policy-Driven** - Full control over what agents can access

**Built for Developers Who Want Power & Control**

DX-Platform assumes you:
- Value sovereignty over convenience
- Want complete visibility into automation
- Can handle complexity if it's transparent
- Think in terms of workflows, not features
- Want to amplify your productivity with AI

### The Vision

A world where:
- Developers keep 100% control of code and context
- AI becomes a local utility, not a SaaS subscription
- Multiple AI models coordinate seamlessly
- Your only limit is hardware and imagination

**Welcome to DX-Platform. Developer-first. Autonomous. Yours.**

---