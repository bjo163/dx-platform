import type { JobService } from "@neuralforge/job";

export interface GatewayChatMessage {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
}

export type GatewayChatCompletionResult =
  | { status: "completed"; jobId: string; message: string }
  | { status: "failed"; jobId: string; code: string; message: string }
  | { status: "timeout"; jobId: string };

export interface GatewayChatCompletionOptions {
  jobService: Pick<JobService, "createJob" | "getJob" | "cancelJob">;
  model: string;
  messages: GatewayChatMessage[];
  projectRoot: string;
  projectId?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export async function executeGatewayChatCompletion({
  jobService,
  model,
  messages,
  projectRoot,
  projectId = "default",
  timeoutMs = 30 * 60 * 1_000,
  pollIntervalMs = 250,
}: GatewayChatCompletionOptions): Promise<GatewayChatCompletionResult> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("Gateway request timeout must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 1) {
    throw new RangeError("Gateway poll interval must be a positive safe integer.");
  }
  const task = messages.map(({ role, content }) => `${role.toUpperCase()}:\n${content}`).join("\n\n");
  const job = await jobService.createJob({
    task,
    provider: model,
    projectId,
    projectRoot,
  });
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const current = await jobService.getJob(job.jobId);
    if (!current) {
      return {
        status: "failed",
        jobId: job.jobId,
        code: "JOB_NOT_FOUND",
        message: "The provider job disappeared before it completed.",
      };
    }
    if (current.status === "completed" && current.result) {
      return { status: "completed", jobId: current.jobId, message: current.result.message };
    }
    if (current.status === "failed" || current.status === "cancelled") {
      return {
        status: "failed",
        jobId: current.jobId,
        code: current.error?.code ?? "PROVIDER_REQUEST_FAILED",
        message: current.error?.message ?? `The provider job ${current.status}.`,
      };
    }
    if (Date.now() >= deadline) {
      await jobService.cancelJob(job.jobId);
      return { status: "timeout", jobId: job.jobId };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
