# WTAgent

**Local coding workspace powered by web AI providers**

WTAgent is a local-first AI coding agent that runs entirely on your machine. It connects to web-based AI providers (ChatGPT, Gemini, Grok, DeepSeek, GLM, Kimi) through browser automation, giving you full control over your code, data, and execution environment.

## Features

- **Local-first**: All code, data, and execution stays on your machine
- **Provider-agnostic**: Works with ChatGPT, Gemini, Grok, DeepSeek, GLM, Kimi
- **No API keys needed**: Uses your existing browser sessions
- **Secure sandbox**: File system access controlled by approval policies
- **Job-based execution**: Long-running tasks with status tracking and logs
- **Web UI**: Modern Next.js interface for task management
- **Project browser**: Read-only file tree and bounded UTF-8 previews from the configured project root
- **Extensible**: Plugin system for custom tools and integrations

## Architecture

```
┌─────────────────┐     HTTP      ┌─────────────────┐
│   Web UI        │ ────────────► │   API Server    │
│   (Next.js)     │               │   (Fastify)     │
│   :3000         │               │   :8080         │
└─────────────────┘               └────────┬────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
             ┌──────▼──────┐        ┌───────▼───────┐       ┌──────▼──────┐
             │  Job Svc    │        │  Database     │       │  Browser    │
             │  (Queue)    │        │  (PGlite)     │       │  Pool       │
             └─────────────┘        └───────────────┘       └─────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Chrome/Chromium browser installed

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd wtagent

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Start development servers (terminal 1 - API)
pnpm --filter @wtagent/api dev

# Start development servers (terminal 2 - Web)
pnpm --filter @wtagent/web dev
```

### Environment Configuration

Copy the example environment files and adjust as needed:

```bash
# API server configuration
cp apps/api/.env.example apps/api/.env

# Web UI configuration
cp apps/web/.env.example apps/web/.env
```

### First Run

1. Open http://localhost:3000 in your browser
2. Navigate to **Providers** page
3. Click **Connect** for your desired AI provider
4. Complete authentication in the opened browser window
5. Return to **Workspace** and start giving tasks

## Project Structure

```
wtagent/
├── apps/
│   ├── api/              # Fastify API server
│   └── web/              # Next.js web interface
├── packages/
│   ├── browser/          # Browser automation (CDP)
│   ├── job/              # Job queue & execution
│   ├── database/         # PGlite persistence
│   ├── tools/            # Tool implementations (fs, terminal)
│   ├── protocol/         # Agent-provider communication
│   ├── policy/           # Security & approval engine
│   ├── platform/         # OS abstraction
│   ├── session/          # Session management
│   ├── runtime/          # Agent runtime orchestration
│   ├── artifacts/        # Generated artifact handling
│   ├── image/            # Image generation providers
│   ├── audio/            # Audio/music generation
│   ├── mcp/              # Model Context Protocol server
│   ├── sdk/              # External integration SDK
│   ├── cli/              # Command-line interface
│   ├── types/            # Shared TypeScript types
│   ├── shared/           # Shared utilities
│   ├── config-api/       # Configuration API
│   ├── ws-server/        # WebSocket server
│   ├── tests/            # Test utilities
│   ├── plugins/          # Plugin system
│   ├── local/            # Local utilities
│   └── database/         # Database package
├── pnpm-workspace.yaml   # pnpm workspace config
└── README.md             # This file
```

## Available Scripts

```bash
# Build all packages
pnpm run build

# Run tests
pnpm run test

# Lint code
pnpm run lint

# Clean build artifacts
pnpm run clean

# Start API server (production)
pnpm --filter @wtagent/api start

# Start Web UI (production)
pnpm --filter @wtagent/web start
```

## Configuration

### API Server (`apps/api/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | API server port |
| `WTAGENT_HOST` | `127.0.0.1` | API bind address; non-loopback binding requires a 32-character `WTAGENT_JWT_SECRET` |
| `WTAGENT_DATA_DIR` | `.wtagent` | Data directory |
| `WTAGENT_PROJECT_ROOT` | `auto` | Project root directory |
| `WTAGENT_PROVIDER` | `chatgpt` | Default provider |
| `WTAGENT_JWT_SECRET` | unset | Enables bearer-token authentication for every API request |
| `WTAGENT_JOB_TIMEOUT_MS` | `1800000` | Maximum provider execution time per job attempt, in milliseconds |
| `WTAGENT_JOB_TTL_MS` | `86400000` | Time to retain completed, failed, and cancelled jobs, in milliseconds |

The timeout starts after the provider session is authenticated. A timeout ends the attempt as failed with `JOB_TIMEOUT`; it does not retry automatically, and the job can be retried explicitly.
Expired terminal jobs and their activity records are removed automatically, with cleanup running hourly after the API starts. Their session transcript files are removed with them. Pending and running jobs are never removed by retention cleanup.
`WTAGENT_PROJECT_ROOT=auto` uses the repository root; a configured path is resolved by the API and cannot be overridden by a job request. The workspace file browser is read-only, hides `.git`, `.wtagent`, and `node_modules`, and previews UTF-8 files up to 256 KiB.
The API binds to loopback by default. Remote binding is opt-in and fails closed unless `WTAGENT_JWT_SECRET` is at least 32 characters; when a secret is configured, requests without a valid bearer token are rejected.

### Web UI (`apps/web/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_WTAGENT_API_URL` | `http://localhost:8080` | API server URL |

## Supported Providers

| Provider | ID | Status |
|----------|-----|--------|
| ChatGPT | `chatgpt` | ✅ Active |
| Gemini | `gemini` | ✅ Active |
| Grok | `grok` | ✅ Active |
| DeepSeek | `deepseek` | ✅ Active |
| GLM | `glm` | ✅ Active |
| Kimi | `kimi` | ✅ Active |

## Security Model

WTAgent uses a **policy-based approval system**:

1. **Sandbox Modes**:
   - `workspace-read`: Read files in workspace
   - `workspace-write`: Read + write files in workspace
   - `danger-full-access`: Full filesystem + terminal access

2. **Approval Flow**:
   ```
   Tool Call → Policy Engine → User Approval → Execute/Reject
   ```
   Interactive CLI sessions can request approval. Web jobs are unattended and
   currently have no review-and-apply flow. API background jobs therefore only
   receive read-only tools by default, and clients cannot grant write or
   command tools in job requests.

3. **Browser Isolation**:
   - Each provider gets isolated Chrome profile
   - No credentials stored in plaintext
   - Session validation before execution

### Local data and retention

- Project source files remain in the configured project root. Job requests cannot
  override that root.
- PGlite, job metadata, sessions, transcripts, and tool output are stored under
  `WTAGENT_DATA_DIR` (default: `<project root>/.wtagent`). Treat this directory
  and its backups as sensitive because they may contain prompts and provider
  output.
- Directories are created with owner-only permissions where supported; Windows
  uses the current user's inherited filesystem ACL.
- Completed, failed, and cancelled jobs are retained for `WTAGENT_JOB_TTL_MS`.
  Their session transcripts are removed with them. Browser provider profiles
  persist separately under the platform application-data directory until the
  provider is removed. Backups are not pruned automatically.

## Development

### Adding a New Package

1. Create directory under `packages/`
2. Add `package.json` with workspace dependencies
3. Add to `pnpm-workspace.yaml`
4. Run `pnpm install`

### TypeScript Configuration

Packages use TypeScript project references for fast incremental builds. Root `tsconfig.json` references all package `tsconfig.json` files.

### Testing

```bash
# Run all tests
pnpm run test

# Run tests for specific package
pnpm --filter @wtagent/database test
```

## API Reference

### Jobs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/backups` | POST | Create a database and session backup in the configured data directory |
| `/v1/jobs` | POST | Create new job |
| `/v1/jobs` | GET | List all jobs |
| `/v1/jobs/:id` | GET | Get job details |
| `/v1/jobs/:id/status` | GET | Get job status |
| `/v1/jobs/:id/cancel` | POST | Cancel job |
| `/v1/jobs/:id/retry` | POST | Retry failed job |
| `/v1/jobs/:id/logs` | GET | Get job logs |
| `/v1/jobs/:id/events` | GET | SSE event stream |
| `/v1/activity` | GET | List persisted job activity |

The API uses PGlite as the canonical job store at `.wtagent/data/wtagent.pglite`.
Existing JSON job records are imported when their IDs are not already present in PGlite. Existing session events are backfilled to PGlite activity once; subsequent lifecycle changes and runtime activity are committed there in order. If a running job has no lease heartbeat for 120 seconds, recovery marks it failed with `JOB_INTERRUPTED`; it is not replayed automatically because tools may already have changed files. Review its activity and retry it explicitly. PGlite locks job claims so only one worker can claim a pending job at a time.
On startup, existing PGlite data is migrated into the default project without deleting job or provider/profile/plugin records; project-scoped state uses a composite key so the same provider, plugin, or profile can exist in multiple projects.

### Backup and restore

Backups contain a PGlite dump and a copy of the job session files. They do not contain browser profiles, provider login sessions, or credentials. Backups are stored under `.wtagent/backups/` (or under `WTAGENT_DATA_DIR/backups/` when configured). For the closest database/transcript consistency, wait until jobs are idle before creating a backup.

With the API running, create a backup:

```bash
pnpm --filter @wtagent/api backup
```

Restore only after stopping the API, passing the backup directory:

```bash
pnpm --filter @wtagent/api restore -- .wtagent/backups/wtagent-<timestamp>-<id>
```

Restore verifies the manifest checksums and PGlite schema before replacing data. The previous database and session directories are preserved beside their original locations with a `.pre-restore-*` suffix. Keep the backup directory and those safety copies until the restored application has been checked.

### Providers

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/providers` | GET | List all providers |
| `/v1/providers/:id/login` | POST | Start login flow |
| `/v1/providers/:id/verify` | POST | Verify authentication |
| `/v1/providers/:id` | DELETE | Disconnect provider |

### Profile

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/profile` | GET | Get user profile |
| `/v1/profile` | PUT | Update profile |

### Plugins

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/plugins` | GET | List plugins |
| `/v1/plugins/:id` | PUT | Update plugin config |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |

## Known Limitations

- Browser automation depends on a locally installed Chrome/Chromium and per-provider login sessions; headless/CI runs are not supported for provider authentication.
- Official API-key providers and OS credential storage are not implemented yet; only web providers are supported.
- Only one job runs at a time due to the shared browser profile lock.
- Web jobs do not yet provide a reviewable diff and apply workflow. Jobs created
  through the API cannot write files or execute commands; this remains a
  planned capability rather than a verified code-modification workflow.
- Remote API access requires an operator-provided JWT secret, but WTAgent does
  not issue, rotate, or revoke remote bearer tokens yet. Keep remote access
  disabled unless you manage those credentials and protect the network path.
- Streaming chat completions are not supported; requests with `stream: true` are rejected.
- Backup/restore covers PGlite and session transcripts only; browser profiles and credentials are excluded.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Check existing [Issues](../../issues)
- Create a new issue for bugs or feature requests
- Review [Architecture Documentation](docs/ARCHITECTURE.md) for system design