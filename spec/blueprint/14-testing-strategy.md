# WTAgent Master Blueprint — Testing Strategy

## Document: 14-testing-strategy.md
## Status: **HISTORICAL** (archived 2024-01-15)

> **Note**: This document is a historical draft from the project's early design phase. The current release-readiness plan is in `.plan/task.md` (updated November 2026). See the `.plan` directory for the active plan, release criteria, and M0-M5 milestones.

## Document: DRAFT
## Version: 1.0
## Date: 2024-01-15

---

## Testing Strategy Overview

WTAgent uses Vitest for unit testing, Playwright for E2E testing, and MSW for API mocking. This document defines the testing approach, test organization, coverage targets, and test data management.

---

## Test Pyramid

| Level | Description | Tools | Target Coverage |
|-------|-------------|-------|-----------------|
| **Unit Tests** | Individual functions, modules | Vitest | 80%+ |
| **Integration Tests** | Component + API interactions | Vitest + Playwright | 70%+ |
| **E2E Tests** | Full user workflows | Playwright | 50%+ |

---

## Unit Tests

### Test Organization

```
packages/
├── tools/
│   ├── test/
│   │   ├── fs.read.spec.ts
│   │   ├── fs.write.spec.ts
│   │   ├── fs.edit.spec.ts
│   │   └── fs.search.spec.ts
│   └── index.ts
├── policy/
│   ├── test/
│   │   ├── policy-engine.spec.ts
│   │   ├── approval-manager.spec.ts
│   │   └── path-guard.spec.ts
│   └── index.ts
├── protocol/
│   ├── test/
│   │   ├── envelope.spec.ts
│   │   └── prompt-builder.spec.ts
│   └── index.ts
└── types/
    ├── test/
    │   └── types.spec.ts
    └── index.ts
```

### Unit Test Guidelines

| Aspect | Rule |
|--------|------|
| **Test isolation** | Each test independent, no shared state |
| **Arrange-Act-Assert** | AAA pattern for all tests |
| **Mock external deps** | vitest.mock for imports |
| **Test data fixtures** | Use JSON fixtures in test/ directory |
| **Naming** | `feature-description.spec.ts` |
| **Tagging** | `@unit`, `@integration`, `@e2e` for filtering |

### Example Unit Test

```typescript
// packages/tools/test/fs.read.spec.ts
import { describe, it, expect } from 'vitest';
import { fsRead } from '../../src';

describe('fs.read', () => {
  it('reads a file successfully', async () => {
    // Arrange
    const tempDir = await fs.promises.mkdtemp('/tmp/wtagent-test-');
    const testFile = path.join(tempDir, 'test.txt');
    await fs.promises.writeFile(testFile, 'Hello World');

    // Act
    const result = await fsRead({ path: testFile, limit: 100 });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.content).toBe('Hello World');
    expect(result.data?.totalLines).toBe(1);

    // Cleanup
    await fs.promises.rm(tempDir, { recursive: true });
  });

  it('rejects non-existent path', async () => {
    // Arrange
    const result = await fsRead({ path: '/nonexistent/path' });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('FILE_NOT_FOUND');
  });
});
```

---

## Integration Tests

### API Integration Tests

| Test Suite | Endpoint | Setup | Teardown |
|------------|----------|-------|----------|
| `job-creation` | POST /v1/jobs | Mock browser, no CDP | Clean DB |
| `provider-status` | GET /v1/providers | Mock DB | Clean providers |
| `profile-update` | PUT /v1/profile | Mock DB | Clean profile |
| `sse-stream` | GET /v1/jobs/:id/events | Mock SSE | Close connection |

### Browser Integration Tests

| Test Suite | Workflow | Setup | Teardown |
|------------|----------|-------|----------|
| `provider-login` | Provider connect → login → verify | Mock Chrome | Close browser |
| `job-execution` | Submit task → execute → poll | Mock browser, dummy DOM | Close browser |
| `multi-provider` | Switch between providers | Multiple mock profiles | Cleanup |

### Example Integration Test

```typescript
// packages/job/test/job-integration.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createJobService } from '../../src';
import { createMemoryStore } from '@wtagent/database';

describe('Job Service Integration', () => {
  let jobService: any;
  let database: any;

  beforeEach(async () => {
    database = createMemoryStore();
    jobService = createJobService({
      database,
      provider: 'chatgpt',
    });
  });

  afterEach(async () => {
    await database.close();
  });

  it('creates and tracks a job', async () => {
    const job = await jobService.createJob({
      task: 'Create hello.js',
      provider: 'chatgpt',
    });

    expect(job.status).toBe('pending');
    expect(job.jobId).toBeDefined();

    const status = await jobService.getJobStatus(job.jobId);
    expect(status.status).toBe('pending');
  });
});
```

---

## E2E Tests (Playwright)

### Test Organization

```
e2e/
├── tests/
│   ├── provider-login.spec.ts
│   ├── job-submission.spec.ts
│   ├── image-generation.spec.ts
│   └── music-generation.spec.ts
├── fixtures/
│   ├── mock-chatgpt-dom.html
│   └── mock-gemini-dom.html
└── setup/
    └── test-env.ts
```

### E2E Test Guidelines

| Aspect | Rule |
|--------|------|
| **Test isolation** | Fresh browser context per test |
| **Test data** | Use fixtures, not DB (browser state) |
| **Selectors** | Use data-testid attributes |
| **Timeouts** | 30s default, 300s for login |
| **Retries** | 1 retry on flaky tests |
| **Test IDs** | Add `data-testid` to all interactive elements |

### Example E2E Test

```typescript
// e2e/tests/provider-login.spec.ts
import { test, expect, describe } from '@playwright/test';

describe('Provider Login', () => {
  test('should login to ChatGPT successfully', async ({ page }) => {
    // Go to providers page
    await page.goto('http://localhost:3000/providers');

    // Click connect
    await page.click('button:has-text("Connect")');

    // Wait for browser to open
    const [browser] = await Promise.all([
      page.waitEvent('popup'),
      await page.click('button:has-text("Connect")'),
    ]);

    // Complete login in new tab
    await browser.waitForLoadState('networkidle');
    await page.goto('https://chat.openai.com');

    // Verify authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  }, { timeout: 60000 });
});
```

---

## API Mocking (MSW)

### MSW Setup

```typescript
// setup/mocks.ts
import { setupServer } from 'msw/browser';
import { worker } from '../mocks';

const server = setupServer(worker);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// mocks/jobs.ts
export const worker = setupWorker(
  rest.get('/v1/jobs', (req, res, ctx) => {
    return ctx.json([
      { jobId: 'uuid-1', task: 'Test task', status: 'completed' },
    ]);
  })
);
```

### Example MSW Handler

```typescript
// mocks/jobs.ts
export const handler = rest.get('/v1/jobs', (req, res, ctx) => {
  const { status } = req.query();
  return ctx.json(
    jobs.filter((j) => j.status === status || !status)
  );
});
```

---

## Test Coverage Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Overall Coverage** | 80%+ | Core functionality verified |
| **Unit Coverage** | 85%+ | Critical paths verified |
| **Integration Coverage** | 70%+ | API + component flows |
| **E2E Coverage** | 50%+ | User workflows covered |

### Coverage Exclusions

| Excluded | Reason |
|----------|--------|
| Node.js built-in modules | Environment, not business logic |
| Third-party type definitions | External packages |
| Mock/test utility code | Framework code |
| CSS / Styling code | Presentation, not logic |

### Coverage Tools

```bash
# Run coverage
pnpm run test:cov

# View HTML report
pnpm run test:cov:html

# Fail on below threshold
pnpm run test:cov -- --threshold=80
```

---

## Test Data Management

### Fixtures Directory

```
packages/tools/test/fixtures/
├── small-file.txt       # 100 bytes
├── medium-file.txt      # 10KB
├── large-file.txt       # 1MB
├── search-pattern.txt   # search test data
└── success-responses.json  # API mock responses
```

### Database Test Data

```typescript
// test/fixtures/jobs.json
[
  { jobId: 'uuid-1', task: 'Create hello.js', status: 'completed', provider: 'chatgpt' },
  { jobId: 'uuid-2', task: 'Analyze code', status: 'failed', provider: 'gemini' },
]
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      # Chrome for E2E tests
      chrome:
        image: browser/chrome:latest
        env: { CHROMIUM_FLAGS: '--no-sandbox --disable-gpu' }
        ports: [9222:9222]
        options: >-
          sh -c
          '
          /opt/google/chrome/chrome
          --headless
          --disable-gpu
          --no-sandbox
          --remote-debugger-port=9222
          --window-size=1280,800
          &

      # Database (emulated via memory)
      postgres:
        image: crateio/crate:latest
        ports: [4200:4200]

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm run test:cov
      - run: pnpm run test:e2e
```

### CI Checks

| Check | Purpose |
|-------|---------|
| `pnpm run build` | TypeScript compilation |
| `pnpm run test:cov` | Unit + integration tests with coverage |
| `pnpm run test:e2e` | E2E with Playwright |
| `pnpm run lint` | Code quality |
| `pnpm audit` | Dependency vulnerabilities |
| `pnpm run check` | Type check only |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Architecture | Initial draft |