# NeuralForge Master Blueprint — API Architecture

## Document: 10-api-architecture.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## API Architecture Overview

NeuralForge uses Fastify 5 with schema validation (Zod) for a RESTful API. This document defines API design principles, endpoint organization, error handling, security, and versioning strategy.

---

## API Design Principles

| Principle | Implementation |
|-----------|----------------|
| **RESTful** | Resource-oriented URLs, standard HTTP methods |
| **JSON** | All payloads application/json |
| **Idempotent** | GET, PUT, DELETE are idempotent |
| **Versioned** | URL versioning (`/v1/`) |
| **CORS** | Configurable origins |
| **Error Standard** | Consistent error response format |
| **Documentation** | OpenAPI 3.0.3 with Swagger UI |
| **Security** | Rate limiting, input validation, CORS hardening |

---

## API Endpoint Organization

| Group | Prefix | Description | Auth | Rate Limit |
|-------|--------|-------------|------|------------|
| Health | `/health` | System health checks | No | 1000/min |
| Jobs | `/v1/jobs` | Job creation, management, logs | No | 100/min |
| Providers | `/v1/providers` | Provider auth and status | No | 100/min |
| Profile | `/v1/profile` | User profile management | No | 100/min |
| Plugins | `/v1/plugins` | Plugin configuration | No | 100/min |
| Policy | `/v1/policy` | Policy evaluation and approval | No | 100/min |
| Docs | `/docs`, `/redoc` | OpenAPI documentation | No | 100/min |
| OpenAPI | `/openapi.json` | JSON spec | No | 100/min |

---

## API Lifecycle

### Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Request Lifecycle                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Connection → HTTP Parser → Request Context                 │
│  2. Hook: onRequest (Logging, Timing)                         │
│  3. Hook: preParsing (Body size limit, JSON validation)       │
│  4. Hook: preHandler (Auth, Rate limit)                       │
│  5. Route Handler → Schema Validation (Zod)                   │
│  6. Service Layer → Business Logic                            │
│  7. Response Hook: onSend (Headers, CORS)                     │
│  8. Response → Client                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Response Flow

| Phase | Middleware | Purpose |
|-------|------------|---------|
| **Request** | `onRequest` | Log request ID, start timer |
| **Pre-parse** | `preParsing` | Validate content-type, size limit |
| **Pre-handler** | `preHandler` | Auth, rate limit, CSP headers |
| **Handler** | Route | Business logic, service calls |
| **Send** | `onSend` | CORS headers, response time |
| **Error** | `setErrorHandler` | Standardized error format |

---

## Error Handling

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable error message",
    "status": 400,
    "details": { "field": "validation detail" }
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | State conflict (provider not connected) |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency down |

### Error Hook

```typescript
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

---

## CORS Configuration

### Default Origins

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'https://app.neuralforge.local'
];
```

### Hook Implementation

```typescript
app.addHook('onSend', async (request, reply, payload) => {
  const origin = request.headers.origin;
  if (allowedOrigins.includes(origin)) {
    reply.header('access-control-allow-origin', origin);
  }
  
  reply
    .header('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
    .header('access-control-allow-headers', 'Content-Type, Authorization, Idempotency-Key')
    .header('access-control-max-age', '86400');
    
  return payload;
});

// Preflight
app.options('*', async (_request, reply) => {
  reply
    .header('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
    .header('access-control-allow-headers', 'Content-Type, Authorization, Idempotency-Key')
    .header('access-control-max-age', '86400')
    .status(204)
    .send();
});
```

---

## Rate Limiting

### Configuration

```typescript
const rateLimit = fastifyRateLimit({
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
  whitelist: ['127.0.0.1', '::1'],
  skip: (request) => request.url.startsWith('/health')
});

app.register(rateLimit);
```

### Custom Per-Endpoint Limits

| Endpoint | Max | Window | Notes |
|----------|-----|--------|-------|
| `/v1/jobs` | 100 | 1 minute | Job creation |
| `/v1/providers/:id/login` | 5 | 1 minute | Login flow |
| `/health` | 1000 | 1 minute | Health check |
| Others | 100 | 1 minute | Default |

---

## Headers

### Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `no-referrer` | No referrer leakage |
| `Cache-Control` | `no-cache, no-store, must-revalidate` | No caching |

### Response Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Request-ID` | UUID v4 | Request tracing |
| `X-Response-Time` | ms | Latency measurement |
| `Server` | `NeuralForge/1.0.0` | Server identification |

---

## API Versioning Strategy

### Current: URL Versioning
- `/v1/` — Stable (12-month deprecation notice)
- `/v2/` — Future (when breaking changes needed)

### Breaking Changes (Major Version)
- Remove/rename endpoints
- Change request/response schema
- Change error codes
- Remove required fields

### Non-Breaking Changes (Minor Version)
- Add new endpoints
- Add optional request fields
- Add optional response fields
- Add new error codes

---

## API Documentation

### OpenAPI 3.0.3 Generation

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

### Documentation Endpoints

| Endpoint | Description |
|----------|-------------|
| `/docs` | Swagger UI |
| `/redoc` | Redoc |
| `/openapi.json` | JSON spec |

---

## Module Structure

```bash
src/
├── routes/
│   ├── health.ts
│   ├── jobs.ts
│   ├── providers.ts
│   ├── profile.ts
│   ├── plugins.ts
│   ├── policy.ts
│   └── docs.ts
├── schemas/
│   ├── jobs.ts
│   ├── providers.ts
│   ├── profile.ts
│   ├── plugins.ts
│   └── policy.ts
├── middleware/
│   ├── rate-limit.ts
│   ├── cors.ts
│   └── logging.ts
├── openapi.ts
└── swagger.ts
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |