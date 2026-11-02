import * as http from "node:http";
import { URL } from "node:url";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { JobService } from "@wtagent/job";

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

export class GatewayServer {
  private server: http.Server;
  private port: number;
  private jobService: JobService;

  constructor(options: { port?: number; sessionsDir?: string; projectRoot?: string; task?: string } = {}) {
    this.port = options.port ?? 8080;
    this.jobService = new JobService(options.sessionsDir ?? path.join(options.projectRoot ?? ".", "sessions"));
    this.server = http.createServer(this.#handleRequest.bind(this));
  }

  async listen(port?: number): Promise<void> {
    const p = port ?? this.port;
    await this.jobService.initialize();
    return new Promise((resolve, reject) => {
      this.server.listen(p, "127.0.0.1", () => {
        console.log(`Gateway listening on http://127.0.0.1:${p}`);
        resolve();
      });
      this.server.on("error", reject);
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
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

    if (method === "GET" && url.pathname.startsWith("/v1/jobs/")) {
      const jobId = url.pathname.split("/").pop();
      if (jobId) {
        if (url.pathname.endsWith("/logs")) {
          await this.#handleGetJobLogs(req, res, jobId);
          return;
        }
        if (url.pathname.endsWith("/status")) {
          await this.#handleGetJobStatus(req, res, jobId);
          return;
        }
        await this.#handleGetJob(req, res, jobId);
        return;
      }
    }

    if (method === "GET" && url.pathname === "/v1/jobs") {
      await this.#handleListJobs(req, res);
      return;
    }

    if (method === "DELETE" && url.pathname.startsWith("/v1/jobs/")) {
      const jobId = url.pathname.split("/").pop();
      if (jobId) {
        await this.#handleCancelJob(req, res, jobId);
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

    let request: { task: string; metadata?: Record<string, unknown> };
    try {
      request = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Invalid JSON" } }));
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
      await this.jobService.cancelJob(jobId);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ message: "Job cancelled" }));
    } catch (err: any) {
      if (err.message.includes("not found")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: err.message } }));
      } else {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    }
  }
}

export function createGatewayServer(options: { port?: number; sessionsDir?: string; projectRoot?: string; task?: string } = {}): GatewayServer {
  return new GatewayServer(options);
}