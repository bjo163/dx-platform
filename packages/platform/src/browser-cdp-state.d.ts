// Ambient fallback for the CDP profile-state inspector that lives in
// @wtagent/browser. That package is not a declared dependency of
// @wtagent/platform (browser depends on platform, so the reverse edge has no
// link and no emitted types to resolve), yet windows-diagnostics.ts injects
// `inspectCdpProfileState` as a default. This file only describes the single
// member that is consumed here; TypeScript ignores it as soon as
// "@wtagent/browser/cdp-state" resolves to real types.
declare module "@wtagent/browser/cdp-state" {
  export function inspectCdpProfileState(
    profileDir: string,
    options?: Record<string, unknown>,
  ): Promise<{ status: "pass" | "degraded"; detail: string }>;
}
