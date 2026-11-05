// Lease expiry and timeout recovery are driven by clock deltas that are minutes
// long; waiting them out with real timers makes the suite slow and flaky on
// loaded CI machines. This helper installs the shim's fake clock and exposes an
// async tick so a test can move hours forward in one instruction.
export function useFakeClock(t: any, { now = 0, apis = ["Date", "setTimeout", "setInterval"] } = {}) {
  t.mock.timers.enable({ apis, now });
  return {
    now: () => Date.now(),
    set: (ms: number) => t.mock.timers.setTime(ms),
    async advance(ms: number) {
      await t.mock.timers.tickAsync(ms);
    },
  };
}
