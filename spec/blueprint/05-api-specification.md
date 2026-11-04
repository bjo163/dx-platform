# Technical Specification: OpenAPI Specification

## SPEC-ID: API-SPEC-001
## Version: 1.0
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Owner: @neuralforge/api
## Related: JOB-SPEC-001, PROV-SPEC-001, TOOL-SPEC-001, POLICY-SPEC-001

---

## A. Identity

- **Spec ID**: API-SPEC-001
- **Name**: OpenAPI Specification
- **Version**: 1.0
- **Status**: DRAFT
- **Owner**: @neuralforge/api
- **Related Requirements**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012
- **Dependencies**: @neuralforge/api, @neuralforge/job, @neuralforge/browser, @neuralforge/tools, @neuralforge/policy

---

## B. Purpose

The OpenAPI specification defines the complete REST API contract for the NeuralForge system. It enables:
- Automatic client code generation
- API documentation (Swagger UI/Redoc)
- Contract testing
- API versioning
- Security scheme definition
- Error response standardization

---

## C. Scope

**Included**:
- All HTTP endpoints (Jobs, Providers, Profile, Plugins, Health, Policy)
- Request/response schemas
- Query parameters and headers
- Status codes and error responses
- Security schemes (none for local-only, future JWT)
- Server configuration
- Tags and operation descriptions

**Excluded**:
- WebSocket/SSE endpoints (documented separately)
- Internal package APIs
- CLI interface
- Configuration files
- Database schema

---

## D. Functional Behavior

### API Design Principles

1. **RESTful**: Resource-oriented URLs, standard HTTP methods
2. **JSON**: All payloads application/json
3. **Idempotent**: GET, PUT, DELETE are idempotent
4. **Versioned**: URL versioning (`/v1/`)
5. **CORS**: Configurable origins
6. **Error Standard**: Consistent error response format
7. **Pagination**: Not used (small datasets)
8. **Filtering**: Query parameters for listing

### Endpoint Groups

| Group | Prefix | Description |
|-------|--------|-------------|
| Health | `/health` | System health checks |
| Jobs | `/v1/jobs` | Job creation, management, logs |
| Providers | `/v1/providers` | Provider authentication and status |
| Profile | `/v1/profile` | User profile management |
| Plugins | `/v1/plugins` | Plugin configuration |
| Policy | `/v1/policy` | Policy evaluation and approval |

### Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Auth required (future) |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource missing |
| 409 | Conflict | State conflict (e.g. provider not connected) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected error |
| 503 | Service Unavailable | Dependent service down |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable error message",
    "status": 400,
    "details": { "field": "error detail" }
  }
}
```

### Security

- **Current**: No authentication (local-first)
- **Future**: JWT Bearer token
- **CORS**: Configurable origins
- **Rate Limiting**: Per IP, per endpoint
- **Headers**: `X-Request-ID` for tracing

---

## E. Technical Design

### Architecture

```
┌──────────────────────────────────────────────────────┐
│                    API Layer                         │
├──────────────────────────────────────────────────────┤
│  Fastify Server          │  Route Handlers            │
│  (Fastify 5.x)           │  ┌─────────────────────┐  │
│  ┌─────────────────────┐  │  │  Job Handlers       │  │
│  │  Hooks              │  │  │  Provider Handlers  │  │
│  │  - onSend (CORS)    │  │  │  Profile Handlers   │  │
│  │  - onRequest (Log)  │  │  │  Plugin Handlers    │  │
│  │  - preParsing (Body)│  │  │  Policy Handlers    │  │
│  │  - preHandler (Auth)│  │  │  Health Handlers    │  │
│  └─────────┬───────────┘  │  └─────────────────────┘  │
│            │              │                           │
│            ▼              │                           │
│  ┌─────────────────┐      │                           │
│  │  Schema Validation│    │                           │
│  │  (Zod + Fastify)  │    │                           │
│  └─────────┬───────────┘  │                           │
│            │              │                           │
│            ▼              │                           │
│  ┌─────────────────┐      │                           │
│  │  Service Layer  │◄─────┤                           │
│  │  (Job, Provider,  │    │                           │
│  │   Profile, etc.)  │    │                           │
│  └─────────────────┘      │                           │
└──────────────────────────────────────────────────────┘
```

### Module Structure

- `src/routes/` — Route handlers by domain
- `src/schemas/` — Zod schemas for validation
- `src/middleware/` — Custom middleware
- `src/openapi.ts` — OpenAPI document generation
- `src/swagger.ts` — Swagger UI integration

### Schema Definitions

```typescript
// Job schemas
const JobStatus = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
const JobRecord = z.object({
  jobId: z.string().uuid(),
  task: z.string().min(1),
  status: JobStatus,
  provider: z.string(),
  projectRoot: z.string(),
  allowedTools: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  result: z.object({ message: z.string() }).optional(),
  error: z.object({ message: z.string(), code: z.string() }).optional()
});

// Provider schemas
const ProviderState = z.object({
  id: z.string(),
  name: z.string(),
  configured: z.boolean(),
  authenticated: z.boolean(),
  supported: z.boolean(),
  guidance: z.string(),
  lastVerifiedAt: z.string().datetime().nullable()
});

// Profile schemas
const Profile = z.object({
  profile_id: z.string(),
  display_name: z.string().min(1).max(60),
  initials: z.string().length(1).max(2)
});

// Error schema
const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    status: z.number().int().min(400).max(599),
    details: z.record(z.unknown()).optional()
  })
});
```

### Hooks

```typescript
// CORS Hook
app.addHook('onSend', async (request, reply, payload) => {
  reply.header('access-control-allow-origin', '*');
  return payload;
});

app.options('*', async (_request, reply) => {
  reply
    .header('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
    .header('access-control-allow-headers', 'Content-Type, Authorization, Idempotency-Key')
    .status(204)
    .send();
});

// Error Handler
app.setErrorHandler((error, _request, reply) => {
  const statusCode = error.statusCode || 500;
  const message = error instanceof Error ? error.message : 'The request could not be completed.';
  
  reply.code(statusCode).send({
    error: {
      code: statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      message: statusCode >= 500 ? 'The request could not be completed.' : message,
      status: statusCode
    }
  });
});
```

### OpenAPI Document Generation

```typescript
import { OpenAPIV3 } from 'openapi-types';

const openapiDoc: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'NeuralForge API',
    version: '1.0.0',
    description: 'Local AI coding agent API',
    contact: { name: 'NeuralForge Team', url: 'https://github.com/neuralforge/neuralforge' },
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' }
  },
  servers: [
    { url: 'http://localhost:8080', description: 'Development server' },
    { url: 'https://api.neuralforge.local', description: 'Production server' }
  ],
  paths: { /* all endpoints */ },
  components: {
    schemas: { /* all schemas */ },
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } }
  },
  tags: [
    { name: 'health', description: 'System health checks' },
    { name: 'jobs', description: 'Job management' },
    { name: 'providers', description: 'Provider authentication' },
    { name: 'profile', description: 'User profile' },
    { name: 'plugins', description: 'Plugin management' },
    { name: 'policy', description: 'Policy engine' }
  ]
};
```

---

## F. Data Contract

### Common Types

```typescript
// Pagination (future)
interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

// List response
interface ListResponse<T> {
  items: T[];
  count: number;
  total?: number;
}

// Timestamp
type ISODateTime = string; // RFC 3339

// UUID
type UUID = string; // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

### Job Schemas

**JobCreateRequest**
```json
{
  "task": "Create a React component",
  "provider": "chatgpt",
  "projectRoot": "/home/user/project",
  "allowedTools": ["fs.read", "fs.write", "terminal.exec"],
  "metadata": { "context": "feature-work" }
}
```

**JobCreateResponse**
```json
{
  "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "task": "Create a React component",
  "status": "pending",
  "provider": "chatgpt",
  "projectRoot": "/home/user/project",
  "metadata": { "context": "feature-work" },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**JobStatusResponse**
```json
{
  "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "running",
  "provider": "chatgpt",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**JobLogsResponse**
```json
{
  "transcript": [
    {"role": "user", "content": "Create hello.js"},
    {"role": "agent", "content": "Creating file..."}
  ],
  "stdout": "node hello.js\\nHello World\\n",
  "stderr": ""
}
```

### Provider Schemas

**ProviderListResponse**
```json
[
  {
    "id": "chatgpt",
    "name": "ChatGPT",
    "configured": true,
    "authenticated": true,
    "supported": true,
    "guidance": "Connect using a dedicated local browser profile.",
    "lastVerifiedAt": "2024-01-15T10:30:00Z"
  }
]
```

**ProviderLoginResponse**
```json
{
  "id": "chatgpt",
  "status": "connecting"
}
```

**ProviderVerifyResponse**
```json
{
  "id": "chatgpt",
  "authenticated": true
}
```

### Profile Schemas

**ProfileGetResponse**
```json
{
  "profile_id": "default",
  "display_name": "Developer",
  "initials": "D"
}
```

**ProfileUpdateRequest**
```json
{
  "displayName": "John Doe"
}
```

**ProfileUpdateResponse**
```json
{
  "profile_id": "default",
  "display_name": "John Doe",
  "initials": "JD"
}
```

### Health Schema

**HealthResponse**
```json
{
  "status": "ok",
  "port": 8080,
  "uptime": 3600,
  "version": "1.0.0"
}
```

---

## G. API Contract

### Health Endpoints

**GET /health**

**Response**: 200 OK
```json
{
  "status": "ok",
  "port": 8080
}
```

### Jobs Endpoints

**GET /v1/jobs**

**Query**: `limit` (int, default 100), `offset` (int, default 0), `status` (enum)

**Response**: 200 OK
```json
[
  {
    "jobId": "uuid",
    "task": "Create hello world",
    "status": "completed",
    "provider": "chatgpt",
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:35:00Z"
  }
]
```

**POST /v1/jobs**

**Body**: JobCreateRequest

**Response**: 201 Created
```json
{
  "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "task": "Create hello world",
  "status": "pending",
  "provider": "chatgpt",
  "projectRoot": "/home/user/project",
  "metadata": {},
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**GET /v1/jobs/:id**

**Response**: 200 OK
```json
{
  "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "task": "Create hello world",
  "status": "completed",
  "provider": "chatgpt",
  "projectRoot": "/home/user/project",
  "result": { "message": "File created successfully" },
  "createdAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:35:00Z"
}
```

**POST /v1/jobs/:id/cancel**

**Response**: 200 OK
```json
{
  "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "task": "Create hello world",
  "status": "cancelled",
  "provider": "chatgpt",
  "projectRoot": "/home/user/project",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:32:00Z"
}
```

**POST /v1/jobs/:id/retry**

**Response**: 200 OK
```json
{
  "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "task": "Create hello world",
  "status": "pending",
  "provider": "chatgpt",
  "projectRoot": "/home/user/project",
  "metadata": {},
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

**GET /v1/jobs/:id/logs**

**Response**: 200 OK
```json
{
  "transcript": [
    {"role": "user", "content": "Create hello.js"},
    {"role": "agent", "content": "Creating file..."}
  ],
  "stdout": "node hello.js\nHello World\n",
  "stderr": ""
}
```

**GET /v1/jobs/:id/events**

**Response**: text/event-stream
```text
event: status
data: {"jobId":"f47ac10b-...","status":"running"}

event: logs
data: {"jobId":"f47ac10b-...","stdout":"..."}
```

### Providers Endpoints

**GET /v1/providers**

**Response**: 200 OK
```json
[
  {
    "id": "chatgpt",
    "name": "ChatGPT",
    "configured": true,
    "authenticated": true,
    "supported": true,
    "guidance": "Connect using a dedicated local browser profile.",
    "lastVerifiedAt": "2024-01-15T10:30:00Z"
  }
]
```

**POST /v1/providers/:id/login**

**Response**: 200 OK
```json
{
  "id": "chatgpt",
  "status": "connecting"
}
```

**POST /v1/providers/:id/verify**

**Response**: 200 OK
```json
{
  "id": "chatgpt",
  "authenticated": true
}
```

**DELETE /v1/providers/:id**

**Response**: 200 OK
```json
{
  "id": "chatgpt",
  "authenticated": false
}
```

### Profile Endpoints

**GET /v1/profile**

**Response**: 200 OK
```json
{
  "profile_id": "default",
  "display_name": "Developer",
  "initials": "D"
}
```

**PUT /v1/profile**

**Body**: `{ "displayName": "John Doe" }`

**Response**: 200 OK
```json
{
  "profile_id": "default",
  "display_name": "John Doe",
  "initials": "JD"
}
```

### Plugins Endpoints

**GET /v1/plugins**

**Response**: 200 OK
```json
[
  {
    "id": "github",
    "name": "GitHub",
    "version": "1.0.0",
    "enabled": true,
    "capabilities": ["repository.read", "repository.write"]
  }
]
```

**PUT /v1/plugins/:id**

**Body**: `{ "enabled": true, "config": {} }`

**Response**: 200 OK
```json
{
  "id": "github",
  "enabled": true,
  "config": {}
}
```

### Policy Endpoints

**POST /v1/policy/evaluate**

**Body**:
```json
{
  "tool": "fs.write",
  "params": { "path": "src/index.ts", "content": "..." },
  "context": {
    "projectRoot": "/home/user/project",
    "sandboxMode": "workspace-write"
  }
}
```

**Response**: 200 OK
```json
{
  "action": "require_approval",
  "reason": "File overwrite requires approval"
}
```

**POST /v1/policy/approve**

**Body**:
```json
{
  "approvalId": "uuid",
  "decision": "allow",
  "reason": "User approved file overwrite"
}
```

**Response**: 200 OK
```json
{
  "approvalId": "uuid",
  "decision": "allow",
  "recordedAt": "2024-01-15T10:30:00Z"
}
```

### Error Responses

**400 Bad Request**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Task must be non-empty string",
    "status": 400
  }
}
```

**404 Not Found**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Job not found",
    "status": 404
  }
}
```

**409 Conflict**
```json
{
  "error": {
    "code": "PROVIDER_NOT_CONNECTED",
    "message": "Provider 'chatgpt' must be connected before a job can run.",
    "status": 409
  }
}
```

**500 Internal Server Error**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "The request could not be completed.",
    "status": 500
  }
}
```

---

## H. Security

### Authentication

- **Current**: None (local-first)
- **Future**: JWT Bearer token
- **Header**: `Authorization: Bearer <token>`
- **Scope**: `read`, `write`, `admin`

### CORS

```typescript
// Configurable origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://app.neuralforge.local'
];

app.addHook('onSend', async (request, reply, payload) => {
  reply.header('access-control-allow-origin', allowedOrigins.includes(request.headers.origin) ? request.headers.origin : '');
  return payload;
});
```

### Rate Limiting

```typescript
// Per IP, per endpoint
const rateLimit = fastifyRateLimit({
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
  whitelist: ['127.0.0.1', '::1']
});
app.register(rateLimit);
```

### Headers

| Header | Description |
|--------|-------------|
| `X-Request-ID` | UUID for request tracing |
| `X-Response-Time` | Response time in ms |
| `Server` | `NeuralForge/1.0.0` |
| `Cache-Control` | `no-cache, no-store, must-revalidate` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `no-referrer` |

### Data Protection

- No sensitive data in logs
- Error messages sanitized
- No stack traces in production
- Input validation prevents injection

---

## I. Reliability

### Failure Handling

| Failure Type | Response |
|--------------|----------|
| Validation error | 400 + error details |
| Resource not found | 404 + error details |
| State conflict | 409 + error details |
| Rate limit exceeded | 429 + Retry-After header |
| Server error | 500 + generic message |
| Dependency down | 503 + Service unavailable |

### Timeouts

- **Request timeout**: 30 seconds
- **Body parsing**: 10 seconds
- **Route handler**: 25 seconds
- **Database query**: 5 seconds
- **External call**: 10 seconds

### Retry Logic

- **Client-side**: Retry on 5xx, 429 with exponential backoff
- **Server-side**: No automatic retry (idempotency client responsibility)
- **Circuit breaker**: Not implemented (single process)

### Resource Limits

- **Max request body**: 10MB
- **Max headers**: 100
- **Max header size**: 8KB
- **Concurrent connections**: 1000
- **Keep-alive timeout**: 65 seconds

---

## J. Performance

### Expected Workload

| Metric | Value |
|--------|-------|
| Requests/sec | 1000+ |
| Concurrent connections | 1000 |
| Job creation rate | 100/sec |
| SSE connections | 500 |
| WebSocket connections | 100 |

### Performance Sensitive Paths

1. **Health check** → In-memory (target: <1ms)
2. **Job status** → Index lookup (target: <50ms)
3. **Job creation** → Validate → Enqueue (target: <100ms)
4. **Provider list** → DB query (target: <10ms)
5. **SSE broadcast** → Memory push (target: <10ms)

### Resource Constraints

- **Memory**: 100MB max for API server
- **Disk**: 1GB for logs
- **CPU**: 2 cores max
- **File descriptors**: 2000 max

### Caching Strategy

- **Provider states**: Cached 30s
- **Profile**: Cached 5s
- **Plugins**: Cached 1h
- **Rules**: Cached 30s
- **Static assets**: Not applicable (API only)

---

## K. UI/UX

### Developer Experience

- **Swagger UI**: `/docs` endpoint
- **Redoc**: `/redoc` endpoint
- **OpenAPI JSON**: `/openapi.json` endpoint
- **Postman Collection**: Exportable
- **SDK Generation**: OpenAPI Generator compatible

### Error Presentation

- **Validation errors**: Field-level details
- **Error codes**: Machine-readable codes
- **Status codes**: Standard HTTP semantics
- **Messages**: User-friendly, no internal details

### Accessibility

- **JSON responses**: Proper content-type
- **Status codes**: Semantic HTTP
- **Headers**: Security headers
- **Rate limits**: Retry-After header

---

## L. Testing

### Unit Tests

| Module | Test Coverage |
|--------|---------------|
| Route Handlers | 100% status codes |
| Schema Validation | 100% validation rules |
| Middleware | 100% hook execution |
| Error Handling | 100% error formats |
| OpenAPI Generation | 100% spec compliance |

### Integration Tests

- Full CRUD cycles for all resources
- Error scenarios (400, 404, 409, 500)
- Rate limiting enforcement
- CORS headers verification
- SSE stream delivery
- OpenAPI spec validation

### Contract Tests

- OpenAPI spec matches implementation
- Client SDK generation works
- Backward compatibility maintained
- Versioning strategy validated

### Performance Tests

- 1000 RPS sustained
- 1000 concurrent connections
- Latency <100ms for 95th percentile
- Memory leak detection
- CPU utilization <80%

---

## M. Acceptance Criteria

1. [ ] All endpoints documented in OpenAPI spec
2. [ ] Schemas match implementation exactly
3. [ ] Status codes follow HTTP standards
4. [ ] Error responses follow standard format
5. [ ] CORS headers configured correctly
6. [ ] Rate limiting enforces limits
7. [ ] SSE streams deliver real-time updates
8. [ ] OpenAPI spec validates against 3.0.3
9. [ ] Client SDK generation works (TypeScript)
10. [ ] Swagger UI accessible at `/docs`
11. [ ] Redoc accessible at `/redoc`
12. [ ] OpenAPI JSON accessible at `/openapi.json`
13. [ ] Unit tests cover 90%+ of routes
14. [ ] Integration tests validate full flows
15. [ ] Contract tests pass (spec ↔ implementation)

---

## N. Implementation Constraints

1. **Fastify**: 5.x (ESM, schema validation)
2. **Zod**: Runtime validation
3. **OpenAPI**: 3.0.3 specification
4. **TypeScript**: 5.9 strict mode
5. **No external dependencies**: Only workspace packages
6. **Backward compatibility**: Existing API contract unchanged
7. **Security**: No injection vulnerabilities
8. **Performance**: <100ms latency for 95th percentile

---

## O. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |

---

## P. Related Specifications

- **JOB-SPEC-001**: Job Service Specification
- **PROV-SPEC-001**: Provider Integration Specification
- **TOOL-SPEC-001**: File System Tool Specification
- **POLICY-SPEC-001**: Approval Engine Specification
- **ARCHITECTURE.md**: System Architecture Documentation