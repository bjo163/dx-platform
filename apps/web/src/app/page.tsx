 "use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { subscribeToJobEvents, type JobEventConnection, type JobStatusEvent } from "./job-events";

type Message = {
  role: "user" | "agent";
  text: string;
};

type JobRecord = {
  jobId: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  provider: string;
  result?: { message: string } | null;
  error?: { message: string } | null;
};

type WorkspaceProvider = { id: string; name: string; authenticated: boolean; supported: boolean };
type WorkspaceInfo = { id: string; name: string; path: string };
type WorkspaceFile = { name: string; type: "directory" | "file" | "other"; path: string };

const apiUrl = process.env.NEXT_PUBLIC_NEURALFORGE_API_URL ?? "http://localhost:8080";

const initialMessages: Message[] = [
  {
    role: "agent",
    text: "NeuralForge Omni-Nexus online. Orchestrate your AI swarm.. Describe a change, ask for an implementation review, or choose a file to inspect.",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("chatgpt");
  const [providers, setProviders] = useState<WorkspaceProvider[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [profile, setProfile] = useState({ displayName: "Developer", initials: "D" });
  const [recentJobs, setRecentJobs] = useState<JobRecord[]>([]);
  const [filePath, setFilePath] = useState("");
  const [fileEntries, setFileEntries] = useState<WorkspaceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileError, setFileError] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Preview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [running, setRunning] = useState(false);
  const [jobUpdates, setJobUpdates] = useState<JobEventConnection>("connecting");
  const currentJobId = useRef<string | null>(null);
  const [backendState, setBackendState] = useState<"checking" | "connected" | "offline">("checking");
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const response = await fetch(`${apiUrl}/health`);
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        if (!cancelled) {
          setBackendState("connected");
          setBackendError("");
        }
      } catch {
        if (!cancelled) {
          setBackendState("offline");
          setBackendError(`Cannot reach NeuralForge API at ${apiUrl}`);
        }
      }
    }

    void connect();
    const interval = window.setInterval(connect, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const [providerPayload, profilePayload, jobPayload, workspacePayload] = await Promise.all([
          fetch(`${apiUrl}/v1/providers`),
          fetch(`${apiUrl}/v1/profile`),
          fetch(`${apiUrl}/v1/jobs`),
          fetch(`${apiUrl}/v1/workspace`),
        ]);
        for (const response of [providerPayload, profilePayload, jobPayload, workspacePayload]) {
          if (!response.ok) throw new Error(`API returned ${response.status}`);
        }
        const [providersData, profileData, jobsData, workspaceData] = await Promise.all([
          providerPayload.json(),
          profilePayload.json(),
          jobPayload.json(),
          workspacePayload.json(),
        ]);
        const providerList = providersData as WorkspaceProvider[];
        const apiProfile = profileData as { display_name?: string; initials?: string } | null;
        const jobs = jobsData as JobRecord[];
        setProviders(providerList);
        setRecentJobs(jobs.slice(0, 6));
        setWorkspace(workspaceData as WorkspaceInfo);
        if (apiProfile) setProfile({ displayName: apiProfile.display_name ?? "Developer", initials: apiProfile.initials ?? "D" });
        const connected = providerList.find((item) => item.supported && item.authenticated);
        if (connected) setProvider(connected.id);
      } catch (error) {
        setBackendError(error instanceof Error ? error.message : "Could not load workspace data.");
      }
    }

    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (activeTab !== "Files" || !workspace) return;
    let cancelled = false;
    setFilesLoading(true);
    setFileError("");
    fetch(`${apiUrl}/v1/workspace/files?path=${encodeURIComponent(filePath || ".")}`)
      .then(async (response) => {
        const payload = await response.json() as { entries?: WorkspaceFile[]; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message ?? `API returned ${response.status}`);
        if (!cancelled) setFileEntries(payload.entries ?? []);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFileError(error instanceof Error ? error.message : "Could not load project files.");
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, filePath, workspace]);

  useEffect(() => {
    if (!selectedFile) {
      setFileContent("");
      return;
    }
    let cancelled = false;
    setFileContent("");
    setFileError("");
    fetch(`${apiUrl}/v1/workspace/file?path=${encodeURIComponent(selectedFile)}`)
      .then(async (response) => {
        const payload = await response.json() as { content?: string; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message ?? `API returned ${response.status}`);
        if (!cancelled) setFileContent(payload.content ?? "");
      })
      .catch((error: unknown) => {
        if (!cancelled) setFileError(error instanceof Error ? error.message : "Could not preview this file.");
      });
    return () => { cancelled = true; };
  }, [selectedFile]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const task = prompt.trim();
    if (!task || running) return;
    const selected = providers.find((item) => item.id === provider);
    if (selected && (!selected.supported || !selected.authenticated)) {
      setBackendError(`${provider} is not connected. Connect it from Providers.`);
      return;
    }

    setMessages((current) => [...current, { role: "user", text: task }]);
    setPrompt("");
    setRunning(true);
    void createJob(task);
  }

  async function createJob(task: string) {
    try {
      const response = await fetch(`${apiUrl}/v1/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          provider,
          projectId: workspace?.id ?? "default",
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? `API returned ${response.status}`);
      }

      const job = await response.json() as JobRecord;
      currentJobId.current = job.jobId;
      setMessages((current) => [
        ...current,
        {
          role: "agent",
          text: `Mission deployed to swarm as job ${job.jobId}.`,
        },
      ]);
      setRecentJobs((current) => [job, ...current.filter((item) => item.jobId !== job.jobId)].slice(0, 6));
    } catch (error) {
      currentJobId.current = null;
      setMessages((current) => [
        ...current,
        { role: "agent", text: error instanceof Error ? error.message : "The task could not be queued." },
      ]);
      setRunning(false);
    }
  }

  useEffect(() => {
    const activeJobIds = recentJobs
      .filter((job) => job.status === "pending" || job.status === "running")
      .map((job) => job.jobId);
    if (activeJobIds.length === 0) return;

    const subscriptions = activeJobIds.map((jobId) => subscribeToJobEvents(jobId, (status: JobStatusEvent) => {
      setRecentJobs((current) => current.map((job) => job.jobId === status.jobId
        ? { ...job, ...status }
        : job));
      if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
        setMessages((current) => [
          ...current,
          {
            role: "agent",
            text: status.status === "completed"
              ? status.result?.message ?? "Task completed."
              : status.error?.message ?? `Task ${status.status}.`,
          },
        ]);
        if (status.jobId === currentJobId.current) {
          currentJobId.current = null;
          setRunning(false);
        }
      }
    }, setJobUpdates));
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [recentJobs.map((job) => job.jobId).join("|"), recentJobs
    .filter((job) => job.status === "pending" || job.status === "running")
    .map((job) => job.jobId)
    .join("|")]);

  return (
    <main className={`app-shell ${sidebarOpen ? "" : "app-shell--sidebar-closed"}`}>
      <aside className={`sidebar ${sidebarOpen ? "" : "sidebar--closed"}`} aria-label="Workspace navigation">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">W</div>
          <span>NeuralForge</span>
          <button
            className="icon-button collapse-button"
            type="button"
            aria-label="Collapse sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <span aria-hidden="true">‹</span>
          </button>
        </div>

        <button className="new-task-button" type="button" onClick={() => setMessages(initialMessages)}>
          <span aria-hidden="true">+</span>
          New task
        </button>

        <nav className="session-nav" aria-label="Recent tasks">
          <p className="section-label">Recent</p>
          {recentJobs.length === 0 && <p className="sidebar-empty">No tasks queued yet.</p>}
          {recentJobs.map((job, index) => (
            <Link
              className={`session-item ${index === 0 ? "session-item--active" : ""}`}
              href={`/jobs/${job.jobId}`}
              key={job.jobId}
            >
              <span>{job.task}</span>
              <small>{job.status}</small>
            </Link>
          ))}
        </nav>

        <nav className="app-nav" aria-label="Application navigation">
          <Link href="/workspace" className="active">Workspace</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/plugins">Plugins</Link>
          <Link href="/providers">Providers</Link>
          <Link href="/settings">Settings</Link>
        </nav>

        <div className="sidebar-footer">
          <div className="connection-line">
            <span className={`connection-state connection-state--${backendState}`} aria-hidden="true" />
            <span>{backendState === "connected" ? "API connected" : backendState === "checking" ? "Checking API" : "API offline"}</span>
          </div>
          <Link className="profile-button" href="/profile">
            <span className="profile-avatar" aria-hidden="true">{profile.initials}</span>
            <span>{profile.displayName}</span>
          </Link>
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          className="icon-button open-sidebar"
          type="button"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <span aria-hidden="true">›</span>
        </button>
      )}

      <section className="workspace">
        <header className="workspace-header">
          <div className="workspace-title">
            <span className="folder-glyph" aria-hidden="true">⌁</span>
            <div>
              <strong>{workspace?.name ?? "Loading project..."}</strong>
              <span>{workspace?.path ?? "Configured project"}</span>
            </div>
          </div>
          <label className="provider-control">
            <span>Provider</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              {providers.filter((item) => item.supported).map((item) => (
                <option key={item.id} value={item.id} disabled={!item.authenticated}>{item.name}{item.authenticated ? "" : " (connect required)"}</option>
              ))}
              {providers.length === 0 && <option value="chatgpt">ChatGPT</option>}
            </select>
          </label>
        </header>

        <div className="workspace-body">
          <section className="conversation" aria-label="Agent conversation">
            <div className="conversation-scroll">
              <div className="task-heading">
                <div>
                  <span className="task-kicker">Current task</span>
                  <h1>{recentJobs[0]?.task ?? `Work on ${workspace?.name ?? "your project"}`}</h1>
                </div>
                <span className={`task-state ${running ? "task-state--running" : ""}`}>
                  {running ? "Running" : recentJobs.some((job) => job.status === "pending" || job.status === "running")
                    ? jobUpdates === "live" ? "Live updates" : jobUpdates === "error" ? "Updates unavailable" : "Polling updates"
                    : backendState === "connected" ? "Ready" : "API offline"}
                </span>
              </div>

              <div className="message-list" aria-live="polite" aria-relevant="additions">
                {backendError && (
                  <p className="backend-error" role="alert">{backendError}</p>
                )}
                {messages.map((message, index) => (
                  <article className={`message message--${message.role}`} key={`${message.role}-${index}`}>
                    <div className="message-avatar" aria-hidden="true">{message.role === "agent" ? "W" : "Y"}</div>
                    <div>
                      <strong>{message.role === "agent" ? "NeuralForge" : "You"}</strong>
                      <p>{message.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <form className="composer" onSubmit={handleSubmit}>
              <label htmlFor="task-input">Task</label>
              <textarea
                id="task-input"
                rows={3}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask NeuralForge to change or inspect the project..."
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="composer-actions">
                <span>{providers.find((item) => item.id === provider)?.name ?? provider} · local browser session</span>
                <button type="submit" disabled={!prompt.trim() || running}>
                  {running ? "Working..." : "Send task"}
                </button>
              </div>
            </form>
          </section>

          <section className="inspector" aria-label="Workspace details">
            <div className="tabs" role="tablist" aria-label="Workspace views">
              {["Preview", "Files", "Activity"].map((tab) => (
                <button
                  key={tab}
                  id={`${tab.toLowerCase()}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`${tab.toLowerCase()}-panel`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="inspector-content" role="tabpanel" id={`${activeTab.toLowerCase()}-panel`}>
              {activeTab === "Preview" && (
                <>
                  <div className="preview-address">
                    <span aria-hidden="true">●</span>
                    <code>localhost:3000</code>
                  </div>
                  <div className="preview-page">
                    <span className="preview-kicker">NeuralForge Web Interface</span>
                    <h2>Workspace preview</h2>
                    <p>The interface is running locally.</p>
                  </div>
                </>
              )}

              {activeTab === "Files" && (
                <div className="file-browser">
                  <div className="file-path">{workspace?.path ?? "Selected project"}</div>
                  <div className="file-browser-location">
                    <button
                      type="button"
                      onClick={() => {
                        setFilePath((current) => current.split("/").slice(0, -1).join("/"));
                        setSelectedFile("");
                      }}
                      disabled={!filePath}
                      aria-label="Go to parent directory"
                    >
                      Up
                    </button>
                    <span>{filePath || "/"}</span>
                  </div>
                  {filesLoading && <p className="data-state">Loading project files…</p>}
                  {fileError && <p className="backend-error" role="alert">{fileError}</p>}
                  <ul className="file-list" aria-label="Project files">
                    {fileEntries.map((entry) => (
                      <li key={entry.path}>
                        <button
                          type="button"
                          className={entry.path === selectedFile ? "file-entry file-entry--selected" : "file-entry"}
                          onClick={() => {
                            if (entry.type === "directory") {
                              setFilePath(entry.path);
                              setSelectedFile("");
                            } else if (entry.type === "file") {
                              setSelectedFile(entry.path);
                            }
                          }}
                          disabled={entry.type === "other"}
                        >
                          <span aria-hidden="true">{entry.type === "directory" ? "▸" : "·"}</span>
                          {entry.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {selectedFile && (
                    <section className="file-preview" aria-label="Selected file preview">
                      <div className="file-path">{selectedFile}</div>
                      <pre><code>{fileContent}</code></pre>
                    </section>
                  )}
                </div>
              )}

              {activeTab === "Activity" && (
                <div className="activity-list">
                  {recentJobs.length === 0 && <p className="data-state">No job activity yet.</p>}
                  {recentJobs.map((job) => (
                    <div key={job.jobId}>
                      <span>{job.provider}</span>
                      <p>{job.task} - {job.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}