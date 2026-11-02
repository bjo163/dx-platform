import * as http from "node:http";
import { URL } from "node:url";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { JobService, isValidJobId } from "@wtagent/job";

// Minimal OpenAI-compatible gateway stub with Job API
// Full agent integration will be added in a follow-up iteration

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: "stop";
  }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface GatewayOptions {
  port?: number;
  baseDir?: string;
  projectRoot?: string;
  provider?: string;
  // Grants applied when a job is submitted without its own `allowedTools`. A
  // background job cannot ask a human, so this must stay read-only unless the
  // operator deliberately trusts the queue.
  defaultAllowedTools?: string[];
  // Set to false to expose the job API without executing anything, so the
  // routes can be tested without a browser.
  runJobs?: boolean;
}

// One job at a time is a property of the shared Chrome profile, not a tuning
// choice, so the runner is a single lease-holding loop rather than a pool.
export class GatewayServer {
  private server: http.Server;
  private port: number;
  readonly jobService: JobService;
  private readonly runJobs: boolean;
  #runnerLoop: Promise<void> | null = null;

  constructor(options: GatewayOptions = {}) {
    this.port = options.port ?? 8080;
    this.runJobs = options.runJobs ?? true;
    const baseDir = options.baseDir ?? path.join(options.projectRoot ?? ".", "wtagent-gateway");
    this.jobService = new JobService(baseDir, {
      provider: options.provider,
      defaultAllowedTools: options.defaultAllowedTools ?? [],
    });
    this.server = http.createServer(this.#handleRequest.bind(this));
  }

  async listen(port?: number): Promise<void> {
    const p = port ?? this.port;
    await this.jobService.initialize();
    if (this.runJobs) {
      // Rejections here are I/O faults in the poll loop; the HTTP surface must
      // keep serving the records that do exist.
      this.#runnerLoop = this.jobService.start().catch((err) => {
        console.error(`job runner stopped: ${err?.message ?? err}`);
      });
    }
    return new Promise((resolve, reject) => {
      this.server.listen(p, "127.0.0.1", () => {
        const bound = this.server.address();
        if (bound && typeof bound === "object") this.port = bound.port;
        console.log(`Gateway listening on http://127.0.0.1:${this.port}`);
        resolve();
      });
      this.server.on("error", reject);
    });
  }

  get boundPort(): number {
    return this.port;
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
    if (this.#runnerLoop) {
      await this.jobService.stop();
      await this.#runnerLoop;
      this.#runnerLoop = null;
    }
  }

  // `GET /v1/jobs/:id/logs` — a malformed or traversal-shaped id is a client
  // error, never a path the store is allowed to join onto.
  #parseJobRoute(pathname: string): { jobId: string; action: "item" | "logs" | "status" | "unknown" } | null {
    if (!pathname.startsWith("/v1/jobs/")) return null;
    const [rawId, rawAction, ...extra] = pathname.slice("/v1/jobs/".length).split("/");
    if (extra.length > 0) return { jobId: rawId, action: "unknown" };
    if (!rawAction) return { jobId: rawId, action: "item" };
    if (rawAction === "logs" || rawAction === "status") return { jobId: rawId, action: rawAction };
    return { jobId: rawId, action: "unknown" };
  }

  #reject(res: http.ServerResponse, status: number, message: string): void {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ error: { message } }));
  }

  async #handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const method = req.method;

    // CORS preflight
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      res.end();
      return;
    }

    if (method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", port: this.port }));
      return;
    }

    if (method === "POST" && url.pathname === "/v1/chat/completions") {
      await this.#handleChatCompletion(req, res);
      return;
    }

    // Job API endpoints
    if (method === "POST" && url.pathname === "/v1/jobs") {
      await this.#handleCreateJob(req, res);
      return;
    }

    if (method === "GET" && url.pathname === "/v1/jobs") {
      await this.#handleListJobs(req, res);
      return;
    }

    const route = this.#parseJobRoute(url.pathname);
    if (route) {
      if (route.action === "unknown") {
        this.#reject(res, 404, "Not found");
        return;
      }
      if (!isValidJobId(route.jobId)) {
        this.#reject(res, 400, "Invalid job id");
        return;
      }
      if (method === "GET") {
        if (route.action === "logs") await this.#handleGetJobLogs(req, res, route.jobId);
        else if (route.action === "status") await this.#handleGetJobStatus(req, res, route.jobId);
        else await this.#handleGetJob(req, res, route.jobId);
        return;
      }
      if (method === "DELETE") {
        await this.#handleCancelJob(req, res, route.jobId);
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Not found" } }));
  }

  async #handleChatCompletion(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    let request: OpenAIChatCompletionRequest;
    try {
      request = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Invalid JSON" } }));
      return;
    }

    const stream = request.stream ?? false;

    if (stream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      // Send a single chunk then close
      const chunk: any = {
        id: `chatcmpl-${randomUUID()}`,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: request.model || "wtagent",
        choices: [{
          index: 0,
          delta: { content: "WTAgent gateway response (stub)" },
          finish_reason: "stop",
        }],
      };

      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      const response: OpenAIChatCompletionResponse = {
        id: `chatcmpl-${randomUUID()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: request.model || "wtagent",
        choices: [{
          index: 0,
          message: { role: "assistant", content: "WTAgent gateway response (stub)" },
          finish_reason: "stop",
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
          total_tokens: 20,
        },
      };

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(response));
    }
  }

  async #handleCreateJob(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    let request: { task: string; provider?: string; projectRoot?: string; allowedTools?: string[]; metadata?: Record<string, unknown> };
    try {
      request = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Invalid JSON" } }));
      return;
    }

    if (typeof request?.task !== "string" || !request.task.trim()) {
      this.#reject(res, 400, "`task` must be a non-empty string");
      return;
    }
    if (request.allowedTools !== undefined
      && (!Array.isArray(request.allowedTools) || request.allowedTools.some((name) => typeof name !== "string"))) {
      this.#reject(res, 400, "`allowedTools` must be an array of tool names");
      return;
    }

    try {
      const job = await this.jobService.createJob(request);
      res.writeHead(201, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(job));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    }
  }

  async #handleListJobs(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const jobs = await this.jobService.listJobs();
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(jobs));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    }
  }

  async #handleGetJob(req: http.IncomingMessage, res: http.ServerResponse, jobId: string): Promise<void> {
    try {
      const job = await this.jobService.getJob(jobId);
      if (!job) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Job not found" } }));
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(job));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    }
  }

  async #handleGetJobStatus(req: http.IncomingMessage, res: http.ServerResponse, jobId: string): Promise<void> {
    try {
      const status = await this.jobService.getJobStatus(jobId);
      if (!status) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Job not found" } }));
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(status));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    }
  }

  async #handleGetJobLogs(req: http.IncomingMessage, res: http.ServerResponse, jobId: string): Promise<void> {
    try {
      const logs = await this.jobService.getJobLogs(jobId);
      if (!logs) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Job not found" } }));
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(logs));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    }
  }

  async #handleCancelJob(req: http.IncomingMessage, res: http.ServerResponse, jobId: string): Promise<void> {
    try {
      const job = await this.jobService.cancelJob(jobId);
      if (!job) {
        this.#reject(res, 404, `Job ${jobId} not found`);
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(job));
    } catch (err: any) {
      this.#reject(res, 500, err.message);
    }
  }
}

export function createGatewayServer(options: GatewayOptions = {}): GatewayServer {
  return new GatewayServer(options);
}