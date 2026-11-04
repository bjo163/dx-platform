"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { subscribeToJobEvents, type JobEventConnection, type JobStatusEvent } from "../../job-events";

const apiUrl = process.env.NEXT_PUBLIC_NEURALFORGE_API_URL ?? "http://localhost:8080";
type Job = {
  jobId: string;
  task: string;
  status: string;
  provider: string;
  cancelRequested?: boolean;
  attempts?: number;
  error?: { message?: string } | null;
  result?: { message?: string } | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};
type JobLogs = {
  transcript: { role?: string; content?: unknown }[];
  stdout: string;
  stderr: string;
  events: { type: string; timestamp: string; payload?: Record<string, unknown> }[];
  toolOutputs: { id?: string; name?: string; timestamp?: string; stdout?: string; stderr?: string }[];
  activity: { id: string; kind: string; message: string; createdAt: string }[];
};
type ActivityItem = { timestamp: string; label: string; detail?: string };

function shortDetail(value: string): string {
  const normalized = value.trim();
  return normalized.length > 280 ? `${normalized.slice(0, 277)}...` : normalized;
}

function buildActivity(job: Job, logs: JobLogs): ActivityItem[] {
  if (logs.activity.length > 0) {
    const activityLabels: Record<string, string> = {
      "job.queued": "Job queued",
      "job.running": "Job started",
      "job.completed": "Job completed",
      "job.failed": "Job failed",
      "job.cancelled": "Job cancelled",
      "job.cancel_requested": "Cancellation requested",
      "job.pending": "Retry queued",
      "job.interrupted": "Run interrupted",
    };
    return logs.activity.map((event) => ({
      timestamp: event.createdAt,
      label: activityLabels[event.kind] ?? event.kind.replaceAll(".", " "),
      detail: event.message || undefined,
    }));
  }

  const items: ActivityItem[] = [{
    timestamp: job.createdAt,
    label: "Job queued",
  }];
  if (job.startedAt) items.push({ timestamp: job.startedAt, label: "Job started" });

  for (const event of logs.events) {
    if (event.type === "session.created") continue;
    const payload = event.payload ?? {};
    const eventLabels: Record<string, string> = {
      "runtime.initializing": "Runtime initialized",
      "browser.started": "Browser started",
      "browser.auth_required": "Provider sign-in required",
      "browser.authenticated": "Provider authenticated",
      "conversation.started": "Conversation started",
      "model.message_sent": "Message sent to provider",
      "model.message_complete": "Provider response received",
      "model.progress": "Provider progress",
      "tool.proposed": "Tool proposed",
      "approval.required": "Approval required",
      "tool.started": "Tool started",
      "tool.output": "Tool output",
      "tool.completed": "Tool completed",
      "tool.invalid": "Tool rejected",
      "tool.result_sent": "Tool result sent",
      "run.completed": "Agent run completed",
      "retry.backoff": "Provider retry scheduled",
    };
    const details = [
      typeof payload.name === "string" ? payload.name : "",
      typeof payload.message === "string" ? shortDetail(payload.message) : "",
      typeof payload.phase === "string" ? payload.phase : "",
    ].filter(Boolean);
    items.push({
      timestamp: event.timestamp,
      label: eventLabels[event.type] ?? event.type.replaceAll(".", " "),
      detail: details.join(" · "),
    });
  }

  for (const output of logs.toolOutputs) {
    const content = [output.stdout, output.stderr].filter(Boolean).join("\n");
    items.push({
      timestamp: output.timestamp ?? job.startedAt ?? job.createdAt,
      label: output.name ? `Output from ${output.name}` : "Tool output",
      detail: shortDetail(content),
    });
  }

  if (job.completedAt) {
    items.push({
      timestamp: job.completedAt,
      label: job.status === "completed" ? "Job completed" : `Job ${job.status}`,
      detail: job.error?.message ? shortDetail(job.error.message) : undefined,
    });
  }
  return items.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [job, setJob] = useState<Job | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [id, setId] = useState("");
  const [logs, setLogs] = useState<JobLogs>({
    transcript: [],
    stdout: "",
    stderr: "",
    events: [],
    toolOutputs: [],
    activity: [],
  });
  const [logsState, setLogsState] = useState<"loading" | "ready" | "error">("loading");
  const [logsError, setLogsError] = useState("");
  const [eventConnection, setEventConnection] = useState<JobEventConnection>("connecting");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyAction, setBusyAction] = useState<"cancel" | "retry" | null>(null);
  const activeJob = Boolean(id && job && ["pending", "running"].includes(job.status));

  async function loadLogs(jobId: string) {
    if (logsState !== "ready") setLogsState("loading");
    try {
      const response = await fetch(`${apiUrl}/v1/jobs/${jobId}/logs`);
      if (!response.ok) throw new Error(`Logs API returned ${response.status}`);
      const payload = await response.json() as Partial<JobLogs>;
      setLogs({
        transcript: payload.transcript ?? [],
        stdout: payload.stdout ?? "",
        stderr: payload.stderr ?? "",
        events: payload.events ?? [],
        toolOutputs: payload.toolOutputs ?? [],
        activity: payload.activity ?? [],
      });
      setLogsError("");
      setLogsState("ready");
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : "Activity log could not be loaded.");
      setLogsState("error");
      throw error;
    }
  }

  async function load(jobId = id, showLoading = true) {
    if (!jobId) return;
    if (showLoading) setState("loading");
    try {
      const response = await fetch(`${apiUrl}/v1/jobs/${jobId}`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      setJob(await response.json() as Job);
      setState("ready");
      await loadLogs(jobId).catch((error: unknown) => {
        setLogsError(error instanceof Error ? error.message : "Activity log could not be loaded.");
      });
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void params.then(({ id: resolvedId }) => { setId(resolvedId); void load(resolvedId); });
  }, [params]);

  useEffect(() => {
    if (!activeJob) return;
    return subscribeToJobEvents(id, (status: JobStatusEvent) => {
      setJob((current) => current ? {
        ...current,
        ...status,
        provider: current.provider,
        result: status.result ?? undefined,
        error: status.error ?? undefined,
      } : current);
      setState("ready");
      void loadLogs(id).catch((error: unknown) => {
        setLogsError(error instanceof Error ? error.message : "Activity log could not be loaded.");
      });
    }, setEventConnection);
  }, [id, activeJob]);

  async function action(name: "cancel" | "retry") {
    if (!id || busyAction) return;
    setBusyAction(name);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch(`${apiUrl}/v1/jobs/${id}/${name}`, { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? `Could not ${name} this job (API ${response.status}).`);
      }
      setJob(await response.json() as Job);
      setState("ready");
      setActionMessage(name === "cancel" ? "Cancellation requested." : "Retry queued.");
      await loadLogs(id).catch((error: unknown) => {
        setLogsError(error instanceof Error ? error.message : "Activity log could not be loaded.");
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Could not ${name} this job.`);
    } finally {
      setBusyAction(null);
    }
  }

  const activity = job ? buildActivity(job, logs) : [];

  return (
    <main className="management-shell">
      <nav className="management-nav" aria-label="Primary navigation"><Link href="/workspace">Workspace</Link><Link className="active" href="/jobs">Jobs</Link><Link href="/plugins">Plugins</Link><Link href="/providers">Providers</Link><Link href="/profile">Profile</Link><Link href="/settings">Settings</Link></nav>
      <section>
        <header className="management-header"><div><Link href="/jobs">Jobs</Link><h1>{job?.task ?? "Job detail"}</h1></div></header>
        {state === "loading" && <p className="data-state">Loading job...</p>}
        {state === "error" && <div className="data-state"><p>Job detail could not be loaded.</p><button type="button" onClick={() => load()}>Retry</button></div>}
        {actionError && <p className="data-state" role="alert">{actionError}</p>}
        {actionMessage && <p className="form-message" role="status">{actionMessage}</p>}
        {job && <div className="detail-grid">
          <dl><dt>Status</dt><dd aria-live="polite">{job.cancelRequested && ["pending", "running"].includes(job.status) ? "cancelling" : job.status}</dd><dt>Updates</dt><dd>{["pending", "running"].includes(job.status) ? eventConnection === "live" ? "Live" : eventConnection === "error" ? "Unavailable" : eventConnection === "polling" ? "Polling fallback" : "Connecting" : "Finished"}</dd><dt>Provider</dt><dd>{job.provider}</dd><dt>Attempts</dt><dd>{job.attempts ?? 0}</dd><dt>Created</dt><dd>{new Date(job.createdAt).toLocaleString()}</dd></dl>
          <div className="detail-output"><span>Output</span><pre>{job.result?.message ?? job.error?.message ?? "No result yet."}</pre></div>
          <section className="detail-output activity-panel" aria-label="Job activity">
            <span>Activity log</span>
            {logsState === "loading" && <p className="activity-empty">Loading job activity...</p>}
            {logsState === "error" && <div role="alert"><p>{logsError}</p><button type="button" onClick={() => void loadLogs(id).catch(() => undefined)}>Retry activity</button></div>}
            {logsState === "ready" && logs.events.length === 0 && logs.toolOutputs.length === 0
              && <p className="activity-empty">{job.status === "pending" ? "Job is queued. Runtime activity will appear when it starts." : "No runtime activity was recorded for this job."}</p>}
            {logsState === "ready" && <ol className="activity-timeline">
                {activity.map((item, index) => (
                  <li key={`${item.timestamp}-${item.label}-${index}`}>
                    <time dateTime={item.timestamp}>{new Date(item.timestamp).toLocaleTimeString()}</time>
                    <div><strong>{item.label}</strong>{item.detail && <p>{item.detail}</p>}</div>
                  </li>
                ))}
            </ol>}
          </section>
          <div className="detail-actions">
            <button type="button" disabled={!["pending", "running"].includes(job.status) || Boolean(job.cancelRequested) || busyAction !== null} onClick={() => void action("cancel")}>{busyAction === "cancel" || (job.cancelRequested && ["pending", "running"].includes(job.status)) ? "Cancelling..." : "Cancel job"}</button>
            <button type="button" disabled={!["failed", "cancelled"].includes(job.status) || busyAction !== null} onClick={() => void action("retry")}>{busyAction === "retry" ? "Queueing..." : "Retry job"}</button>
          </div>
        </div>}
      </section>
    </main>
  );
}
