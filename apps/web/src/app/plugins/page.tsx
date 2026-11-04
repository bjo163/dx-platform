"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_NEURALFORGE_API_URL ?? "http://localhost:8080";
type Plugin = { id: string; name: string; version: string; enabled: boolean; capabilities: string[] };

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  async function load() {
    setState("loading");
    try {
      const response = await fetch(`${apiUrl}/v1/plugins`);
      if (!response.ok) throw new Error();
      setPlugins(await response.json() as Plugin[]);
      setState("ready");
    } catch { setState("error"); }
  }
  async function toggle(plugin: Plugin) {
    try {
      const response = await fetch(`${apiUrl}/v1/plugins/${plugin.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !plugin.enabled }) });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      setState("error");
    }
  }
  useEffect(() => { void load(); }, []);
  return (
    <main className="management-shell"><nav className="management-nav" aria-label="Primary navigation"><Link href="/workspace">Workspace</Link><Link href="/jobs">Jobs</Link><Link className="active" href="/plugins">Plugins</Link><Link href="/providers">Providers</Link><Link href="/profile">Profile</Link><Link href="/settings">Settings</Link></nav>
      <section><header className="management-header"><div><span>Capabilities</span><h1>Plugins</h1></div><button type="button" onClick={load}>Refresh</button></header>
        {state === "loading" && <p className="data-state">Loading plugin registry...</p>}
        {state === "error" && <div className="data-state"><p>The plugin registry could not be loaded.</p><button type="button" onClick={load}>Retry</button></div>}
        {state === "ready" && plugins.length === 0 && <div className="data-state"><p>No plugins are registered.</p></div>}
        {state === "ready" && plugins.map((plugin) => <article className="registry-row" key={plugin.id}><div><strong>{plugin.name}</strong><code>{plugin.id} / {plugin.version}</code><span>{plugin.capabilities.join(", ")}</span></div><button type="button" className={plugin.enabled ? "switch-on" : ""} onClick={() => toggle(plugin)}>{plugin.enabled ? "Disable" : "Enable"}</button></article>)}
      </section>
    </main>
  );
}
