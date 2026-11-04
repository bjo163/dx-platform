const apiUrl = process.env.NEXT_PUBLIC_WTAGENT_API_URL ?? "http://localhost:8080";

export type JobStatusEvent = {
  jobId: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  result?: { message: string } | null;
  error?: { message: string } | null;
};

export type JobEventConnection = "connecting" | "live" | "polling" | "error";

function isTerminal(status: JobStatusEvent["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function subscribeToJobEvents(
  jobId: string,
  onStatus: (status: JobStatusEvent) => void,
  onConnection: (connection: JobEventConnection) => void,
): () => void {
  const source = new EventSource(`${apiUrl}/v1/jobs/${encodeURIComponent(jobId)}/events`);
  let pollingTimer: number | undefined;
  let closed = false;
  let terminal = false;

  const stop = () => {
    closed = true;
    source.close();
    if (pollingTimer !== undefined) window.clearInterval(pollingTimer);
  };

  const poll = async () => {
    if (closed) return;
    try {
      const response = await fetch(`${apiUrl}/v1/jobs/${encodeURIComponent(jobId)}/status`);
      if (!response.ok) throw new Error(`Status API returned ${response.status}`);
      const status = await response.json() as JobStatusEvent;
      if (closed) return;
      onStatus(status);
      onConnection("polling");
      if (isTerminal(status.status)) {
        terminal = true;
        stop();
      }
    } catch {
      onConnection("error");
    }
  };

  const startPolling = () => {
    if (closed || pollingTimer !== undefined) return;
    source.close();
    onConnection("polling");
    void poll();
    pollingTimer = window.setInterval(() => { void poll(); }, 1_000);
  };

  source.onopen = () => onConnection("live");
  source.addEventListener("status", (event) => {
    try {
      const status = JSON.parse((event as MessageEvent<string>).data) as JobStatusEvent;
      if (closed || terminal) return;
      onStatus(status);
      if (isTerminal(status.status)) {
        terminal = true;
        stop();
      }
    } catch {
      startPolling();
    }
  });
  source.onerror = startPolling;

  return stop;
}
