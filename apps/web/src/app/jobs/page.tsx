"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_WTAGENT_API_URL ?? "http://localhost:8080";
const statuses = ["pending", "running", "completed", "failed", "cancelled"] as const;
type JobStatus = typeof statuses[number];
type Job = {
  jobId: string;
  task: string;
  status: JobStatus;
  provider: string;
  createdAt: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The job list request failed.";
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [requestError, setRequestError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [refreshing, setRefreshing] = useState(false);
  const requestInFlight = useRef(false);

  const load = useCallback(async (showLoading = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (showLoading) setState("loading");
    else setRefreshing(true);
    try {
      const response = await fetch(`${apiUrl}/v1/jobs`);
      if (!response.ok) throw new Error(`Jobs API returned ${response.status}.`);
      const result = await response.json() as Job[];
      if (!Array.isArray(result)) throw new Error("Jobs API returned an invalid response.");
      setJobs(result);
      setRequestError("");
      setState("ready");
    } catch (error) {
      setRequestError(errorMessage(error));
      setState((current) => current === "loading" ? "error" : "ready");
    } finally {
      requestInFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => { void load(); }, 3000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filteredJobs = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return jobs.filter((job) => {
      const matchesQuery = !needle
        || [job.task, job.provider, job.jobId].some((value) => value.toLocaleLowerCase().includes(needle));
      return matchesQuery && (statusFilter === "all" || job.status === statusFilter);
    });
  }, [jobs, query, statusFilter]);

  return (
    <main className="management-shell">
      <nav className="management-nav" aria-label="Primary navigation">
        <Link href="/workspace">Workspace</Link><Link className="active" href="/jobs">Jobs</Link>
        <Link href="/plugins">Plugins</Link><Link href="/providers">Providers</Link><Link href="/profile">Profile</Link><Link href="/settings">Settings</Link>
      </nav>
      <section>
        <header className="management-header">
          <div><span>Queue</span><h1>Jobs</h1></div>
          <button type="button" onClick={() => void load()} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>
        {state === "loading" && <p className="data-state" role="status">Loading jobs from the API...</p>}
        {requestError && (
          <div className="data-state job-request-error" role="alert">
            <p>Could not refresh the job list: {requestError}</p>
            <button type="button" onClick={() => void load()}>Retry request</button>
          </div>
        )}
        {state === "ready" && jobs.length === 0 && (
          <div className="data-state">
            <p>No jobs have been queued yet.</p>
            <Link href="/workspace">Create a task in Workspace</Link>
          </div>
        )}
        {state === "ready" && jobs.length > 0 && (
          <>
            <div className="job-filters">
              <label>
                <span>Search jobs</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Task, provider, or job ID"
                />
              </label>
              <label>
                <span>Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | JobStatus)}
                >
                  <option value="all">All statuses</option>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
            <p className="job-result-count" role="status" aria-live="polite">
              Showing {filteredJobs.length} of {jobs.length} jobs
              {refreshing ? " · Refreshing" : ""}
            </p>
            {filteredJobs.length === 0 ? (
              <div className="data-state">
                <p>No jobs match these filters.</p>
                <button type="button" onClick={() => { setQuery(""); setStatusFilter("all"); }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="job-list">
                {filteredJobs.map((job) => (
                  <Link href={`/jobs/${job.jobId}`} className="job-row" key={job.jobId}>
                    <span className={`status-mark status-${job.status}`} aria-hidden="true" />
                    <strong>{job.task}</strong>
                    <span>{job.provider}</span><span>{job.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
