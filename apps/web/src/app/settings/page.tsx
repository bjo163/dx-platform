"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_NEURALFORGE_API_URL ?? "http://localhost:8080";

export default function SettingsPage() {
  const [apiState, setApiState] = useState<"loading" | "connected" | "error">("loading");
  useEffect(() => {
    fetch(`${apiUrl}/health`).then((response) => setApiState(response.ok ? "connected" : "error")).catch(() => setApiState("error"));
  }, []);
  return (
    <main className="management-shell">    <nav className="management-nav" aria-label="Primary navigation"><Link href="/workspace">Workspace</Link><Link href="/jobs">Jobs</Link><Link href="/plugins">Plugins</Link><Link href="/providers">Providers</Link><Link href="/profile">Profile</Link><Link className="active" href="/settings">Settings</Link></nav>
      <section><header className="management-header"><div><span>Local runtime</span><h1>Settings</h1></div></header>
        <dl className="settings-grid">
          <dt>API URL</dt><dd><code>{apiUrl}</code></dd>
          <dt>API state</dt><dd>{apiState === "loading" ? "Checking API..." : apiState === "connected" ? "Connected" : "Unavailable"}</dd>
          <dt>Data directory</dt><dd><code>NEURALFORGE_DATA_DIR / data / neuralforge.pglite</code></dd>
          <dt>Default tools</dt><dd><code>fs.read · fs.search · fs.write · fs.edit · terminal.exec</code></dd>
        </dl>
      </section>
    </main>
  );
}
