import { discoverChromeExecutable } from "../../platform/dist/chrome-discovery.js";

// A browser test may only be skipped because the machine has no browser, never
// because a caller forgot to export a flag: skipping on an env var hides the
// fact that the assertions did not run on a machine that could have run them.
export const browserUnavailable: string | false = (() => {
  try {
    discoverChromeExecutable(null);
    return false;
  } catch (error) {
    return (error as Error).message;
  }
})();
