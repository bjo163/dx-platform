"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_NEURALFORGE_API_URL ?? "http://localhost:8080";
type Provider = { id: string; name: string; configured: boolean; authenticated: boolean; supported: boolean; guidance: string; lastVerifiedAt: string | null };

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  async function load() {
    setState("loading");
    try {
      const response = await fetch(`${apiUrl}/v1/providers`);
      if (!response.ok) throw new Error();
      setProviders(await response.json() as Provider[]);
      setState("ready");
    } catch { setState("error"); }
  }
  async function act(provider: Provider, action: "login" | "verify" | "disconnect") {
    setBusyProvider(provider.id);
    setActionError(null);
    const method = action === "disconnect" ? "DELETE" : "POST";
    const suffix = action === "disconnect" ? "" : `/${action}`;
    try {
      const response = await fetch(`${apiUrl}/v1/providers/${provider.id}${suffix}`, { method });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? "The provider action failed.");
      }
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The provider action failed.");
    } finally {
      setBusyProvider(null);
    }
  }
  useEffect(() => { void load(); }, []);
  return (
    <main className="management-shell"><nav className="management-nav" aria-label="Primary navigation"><Link href="/workspace">Workspace</Link><Link href="/jobs">Jobs</Link><Link href="/plugins">Plugins</Link><Link className="active" href="/providers">Providers</Link><Link href="/profile">Profile</Link><Link href="/settings">Settings</Link></nav>
      <section><header className="management-header"><div><span>Runtime access</span><h1>Providers</h1></div><button type="button" onClick={load}>Refresh</button></header>
        {actionError && <div className="data-state" role="alert"><p>{actionError}</p></div>}
        {state === "loading" && <p className="data-state">Checking provider configuration...</p>}
        {state === "error" && <div className="data-state"><p>Provider state could not be read.</p><button type="button" onClick={load}>Retry</button></div>}
        {state === "ready" && providers.length === 0 && <div className="data-state"><p>No providers are configured.</p></div>}
        {state === "ready" && providers.map((provider) => <article className="registry-row provider-row" key={provider.id}>
          <div><strong>{provider.name}</strong><code>{provider.id}</code><span>{provider.guidance}</span></div>
          <div className="provider-actions">
            <b>{!provider.supported ? "Unsupported" : provider.authenticated ? "Connected" : provider.configured ? "Verification required" : "Login required"}</b>
            <button type="button" disabled={!provider.supported || busyProvider === provider.id} onClick={() => act(provider, "login")}>{busyProvider === provider.id ? "Working..." : "Connect"}</button>
            {provider.configured && <><button type="button" disabled={!provider.supported || busyProvider === provider.id} onClick={() => act(provider, "verify")}>Verify</button><button type="button" disabled={busyProvider === provider.id} onClick={() => act(provider, "disconnect")}>Disconnect</button></>}
          </div>
        </article>)}
      </section>
    </main>
  );
}
