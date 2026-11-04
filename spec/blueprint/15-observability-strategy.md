# NeuralForge Master Blueprint — Observability Strategy

## Document: 15-observability-strategy.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Observability Strategy Overview

NeuralForge implements comprehensive observability through structured logging, metrics collection, health checks, and debugging tools. This document defines observability infrastructure and practices.

---

## Logging Strategy

### Log Structure

All application logs use **structured JSON** format:

```json
{"timestamp":"2024-01-15T10:30:00Z","level":"INFO","message":"Job created","data":{"jobId":"uuid-1","provider":"chatgpt"}}
```

### Log Components

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | ISO 8601 | When the event occurred |
| `level` | string | DEBUG, INFO, WARN, ERROR |
| `message` | string | Human-readable description |
| `data` | object | Contextual data (jobId, tool, etc.) |
| `traceId` | string | Request tracing UUID |
| `spanId` | string | OpenTelemetry span |
| `error` | object | Stack trace if present |

### Log Destinations

| Destination | Format | Retention |
|-------------|--------|-----------|
| `stdout` | JSON lines | Docker/K8s collecting |
| `api.log` | JSON lines | Daily rotation |
| `browser.log` | JSON lines | Daily rotation |
| `audit.jsonl` | JSONL | 7-day retention |
| `error.log` | JSON lines | 30-day retention |

### Logging Configuration

```typescript
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  timestamp: pino.stdLibTimeFunctions.isoFixed,
  redact: ['req.headers.authorization', 'credit-card', 'ssn'],
  base: { pid: process.pid },
});

// Development: pretty-print
if (process.env.NODE_ENV !== 'production') {
  logger.pipe(pretty({ translateTime: ['log', 'info', 'warn', 'error'] }));
}
```

---

## Metrics Collection

### Prometheus Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, endpoint, status | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, endpoint | Request latency |
| `job_queue_length` | Gauge | status | Jobs waiting |
| `job_execution_duration_seconds` | Histogram | provider, status | Job execution time |
| `browser_connection_duration` | Histogram | provider | CDP session uptime |
| `tool_executions_total` | Counter | tool, success/failed | Tool operation count |
| `approval_requests_total` | Counter | tool, decision | Approval workflow count |
| `process_resident_memory_bytes` | Gauge | — | Node.js heap usage |
| `active_sessions` | Gauge | — | Concurrent sessions |

### Metrics Exposure

| Endpoint | Path | Format |
|----------|------|--------|
| `/metrics` | `/metrics` | Prometheus text format |
| Health check | `/health` | JSON {status, uptime, version} |

### Metrics Collection Setup

```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();

// Basic counter
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
});

// Basic histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Register metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);

// Export for /metrics endpoint
export { register };
```

### Dashboard (Grafana)

| Dashboard | Panels |
|-----------|--------|
| **System Health** | Uptime, error rate, latency |
| **Job Metrics** | Queue length, execution time, success rate |
| **Provider Status** | Browser connections, auth state, switch time |
| **Tool Usage** | Execution count, success rate, sandbox mode |
| **Audit Log** | Recent operations, decisions |

---

## Health Dashboard

### Health Check Endpoints

| Endpoint | Check | Response | Frequency |
|----------|-------|----------|-----------|
| `/health` | API responsiveness | `{status, port, uptime, version}` | Every 30s |
| `/v1/providers` | Provider connectivity | `{providers}` | Every 60s |
| `/v1/jobs` | Database connectivity | `{jobCount}` | Every 60s |

### Health Response Format

```json
{
  "status": "ok",
  "port": 8080,
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "api": { "status": "ok", "latencyMs": 5 },
    "providers": { "status": "ok", "count": 3 },
    "database": { "status": "ok", "jobCount": 12 }
  }
}
```

### Health Status Values

| Status | Meaning |
|--------|---------|
| `ok` | All systems nominal |
| `degraded` | Some components slow/unavailable |
| `critical` | Major functionality impaired |
| `unavailable` | System not running |

---

## Debugging Tools

### Debug Endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `/debug/state` | Full system state | Internal only |
| `/debug/queue` | Job queue contents | Internal only |
| `/debug/logs` | Recent audit entries | Internal only |
| `/debug/metrics` | Current metrics snapshot | Internal only |

### Debug Middleware

```typescript
app.use(async (request, reply, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  
  // Add debug headers
  reply.header('X-Response-Time', `${duration}ms`);
  
  // Log to debug endpoint storage
  if (request.headers['x-debug'] === 'true') {
    // Store debug info
  }
});
```

### Debug UI (Future)

```
┌─────────────────────────────────────────────────────────────┐
│                    Debug Panel                              │
├─────────────────────────────────────────────────────────────┤
│  Request ID: abc-123...                                    │
│  Response Time: 45ms                                       │
│                                                           │
│  System State:                                            │
│  ├─ Jobs in queue: 5                                      │
│  ├─ Active browsers: 3                                    │
│  ├─ Approvals pending: 1                                  │
│  └─ Errors: 0                                             │
│                                                           │
│  Recent Audit Entries:                                    │
│  ├─ [10:30] fs.write - allow                             │
│  ├─ [10:30] terminal.exec - deny                         │
│  └─ ...                                                   │
│                                                           │
│  Metrics Snapshot:                                        │
│  ├─ HTTP requests (last min): 42                          │
│  ├─ Avg latency: 32ms                                     │
│  └─ Error count: 0                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |