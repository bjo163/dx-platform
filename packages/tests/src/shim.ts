import { describe as vitestDescribe, it, vi } from "vitest";

// The suite was written against node:test's runner and context API. Only three
// context members are used (after, test, skip), so this adapter keeps 19k lines
// of assertions untouched while vitest owns scheduling and reporting.
type Body = (context?: any) => unknown;

interface Options {
  skip?: boolean | string;
  todo?: boolean | string;
  only?: boolean;
  timeout?: number;
}

// node:test's t.mock.method(...): replace one method, record the calls, and put
// the original back when the test ends. Vitest's own spies are per-file, so the
// restore is tied to the individual test instead.
function mockMethod(vitestContext: any, object: any, name: string, implementation: any) {
  const own = Object.getOwnPropertyDescriptor(object, name);
  const calls: unknown[][] = [];
  const results: { value?: unknown; error?: unknown }[] = [];
  const mock = function (this: unknown, ...args: unknown[]) {
    calls.push(args);
    try {
      const value = implementation.apply(this, args);
      results.push({ value });
      return value;
    } catch (error) {
      results.push({ error });
      throw error;
    }
  };
  Object.assign(mock, { mock: { calls, results, callCount: () => calls.length } });
  Object.defineProperty(object, name, {
    value: mock,
    writable: true,
    configurable: true,
    enumerable: own ? own.enumerable : true,
  });
  vitestContext.onTestFinished(() => {
    if (own) Object.defineProperty(object, name, own);
    else delete object[name];
  });
  return mock;
}

// node:test's t.mock.timers: enable({apis, now}) plus tick(ms). vitest owns the
// same clock, under different names.
function mockTimers(vitestContext: any) {
  let enabled = false;
  return {
    enable(options: { apis?: string[]; now?: number } = {}) {
      if (!enabled) {
        enabled = true;
        vitestContext.onTestFinished(() => { vi.useRealTimers(); });
      }
      const apis = options.apis ?? ["Date", "setTimeout", "setInterval"];
      // node:test fakes a timer and its clear as one unit; sinon keeps them
      // separate, so an interval that is never cleared keeps redrawing.
      const clearOf: Record<string, string> = {
        setInterval: "clearInterval",
        setTimeout: "clearTimeout",
        setImmediate: "clearImmediate",
        requestAnimationFrame: "cancelAnimationFrame",
        requestIdleCallback: "cancelIdleCallback",
      };
      const toFake: string[] = [];
      for (const api of apis) {
        toFake.push(api);
        if (clearOf[api]) toFake.push(clearOf[api]);
      }
      vi.useFakeTimers({ now: options.now ?? 0, toFake: toFake as any });
    },
    tick(ms: number) {
      vi.advanceTimersByTime(ms);
    },
    async tickAsync(ms: number) {
      await vi.advanceTimersByTimeAsync(ms);
    },
    setTime(ms: number) {
      vi.setSystemTime(ms);
    },
    reset() {
      vi.useRealTimers();
      enabled = false;
    },
  };
}

function makeContext(vitestContext: any, name: string) {
  let timers: ReturnType<typeof mockTimers> | null = null;
  return {
    name,
    after(hook: Body) {
      vitestContext.onTestFinished(async () => { await hook(); });
    },
    mock: {
      method: (object: any, methodName: string, implementation?: any) => mockMethod(vitestContext, object, methodName, implementation),
      get timers() {
        timers ??= mockTimers(vitestContext);
        return timers;
      },
    },
    skip(message?: string) {
      if (typeof vitestContext?.skip === "function") vitestContext.skip();
      else console.log(`  - skipped: ${message ?? name}`);
    },
    diagnostic(message: unknown) {
      console.log(message);
    },
    test: async (subName: unknown, optionsOrBody?: unknown, maybeBody?: unknown) => {
      const body = typeof optionsOrBody === "function" ? optionsOrBody as Body : maybeBody as Body;
      await body(makeContext(vitestContext, String(subName)));
    },
  };
}

function register(name: string, optionsOrBody: unknown, maybeBody?: unknown) {
  let options: Options = {};
  let body: Body;
  if (typeof optionsOrBody === "function") {
    body = optionsOrBody as Body;
    options = (maybeBody as Options) ?? {};
  } else {
    options = (optionsOrBody as Options) ?? {};
    body = maybeBody as Body;
  }
  const wrapped = (vitestContext: any) => body(makeContext(vitestContext, name));
  const timeout = typeof options.timeout === "number" ? options.timeout : undefined;
  // node:test prints a skip reason; vitest reports no per-test note, so the
  // reason travels inside the reported name instead of being dropped.
  const label = typeof options.skip === "string" && options.skip ? `${name} — skipped: ${options.skip}` : name;
  if (options.skip || options.todo) return it.skip(label, wrapped, timeout);
  if (options.only) return it.only(name, wrapped, timeout);
  return it(name, wrapped, timeout);
}

export const test = Object.assign(register, {
  only: (name: string, body: Body, options?: Options) => register(name, { only: true, ...options }, body),
  skip: (name: string, body?: Body, options?: Options) => register(name, { skip: true, ...options }, body ?? (() => {})),
  todo: (name: string) => it.todo(name),
  describe: vitestDescribe,
  it: register,
});

export default test;
