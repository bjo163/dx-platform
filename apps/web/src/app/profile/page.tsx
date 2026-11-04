"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_NEURALFORGE_API_URL ?? "http://localhost:8080";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [initials, setInitials] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  async function load() {
    setState("loading");
    try {
      const response = await fetch(`${apiUrl}/v1/profile`);
      if (!response.ok) throw new Error();
      const profile = await response.json() as { display_name: string; initials: string };
      setDisplayName(profile.display_name);
      setInitials(profile.initials);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    if (!name || name.length > 60) {
      setMessage("Enter a display name between 1 and 60 characters.");
      return;
    }
    setState("saving");
    try {
      const response = await fetch(`${apiUrl}/v1/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      if (!response.ok) throw new Error();
      const profile = await response.json() as { initials: string };
      setInitials(profile.initials);
      setMessage("Profile saved.");
      setState("ready");
    } catch {
      setMessage("The profile could not be saved.");
      setState("error");
    }
  }

  return (
    <main className="management-shell">
      <nav className="management-nav" aria-label="Primary navigation">
        <Link href="/workspace">Workspace</Link><Link href="/jobs">Jobs</Link><Link href="/plugins">Plugins</Link>
        <Link href="/providers">Providers</Link><Link className="active" href="/profile">Profile</Link><Link href="/settings">Settings</Link>
      </nav>
      <section>
        <header className="management-header"><div><span>Local identity</span><h1>Profile</h1></div></header>
        {state === "loading" && <p className="data-state">Loading profile...</p>}
        {state === "error" && !displayName && <div className="data-state" role="alert"><p>The profile could not be loaded.</p><button type="button" onClick={load}>Retry</button></div>}
        {(state === "ready" || state === "saving" || state === "error") && displayName && (
          <form className="profile-form" onSubmit={save}>
            <div className="profile-form-preview" aria-hidden="true">{initials || "D"}</div>
            <label htmlFor="display-name">Display name</label>
            <input id="display-name" name="displayName" value={displayName} maxLength={60} onChange={(event) => setDisplayName(event.target.value)} />
            <button type="submit" disabled={state === "saving"}>{state === "saving" ? "Saving..." : "Save profile"}</button>
            <p className="form-message" role="status">{message}</p>
          </form>
        )}
      </section>
    </main>
  );
}
