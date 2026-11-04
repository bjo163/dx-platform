import * as http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { JobService, JobRecord, JobStatus } from "@wtagent/job";
import { randomUUID } from "node:crypto";

export interface JobEvent {
  type: "job:create" | "job:start" | "job:progress" | "job:complete" | "job:fail" | "job:cancel";
  jobId: string;
  timestamp: number;
}

export interface JobProgressEvent extends JobEvent {
  type: "job:progress";
  progress: {
    turn: number;
    phase: string;
    runCount: number;
  };
}

export interface JobCompletedEvent extends JobEvent {
  type: "job:complete";
  jobId: string;
  result: {
    message: string;
    [key: string]: unknown;
  };
}

export interface JobFailedEvent extends JobEvent {
  type: "job:fail";
  jobId: string;
  error: {
    code: string;
    message: string;
  };
}

export interface JobCancelledEvent extends JobEvent {
  type: "job:cancel";
  jobId: string;
}

export interface WSMessage {
  type: string;
  data: unknown;
  timestamp: number;
}

export interface WSServerOptions {
  port?: number;
  baseDir?: string;
  projectRoot?: string;
  provider?: string;
  defaultAllowedTools?: string[];
  runJobs?: boolean;
}

export class WSServer {
  private server: http.Server;
  private wss: WebSocketServer;
  private port: number;
  readonly jobService: JobService;
  private readonly runJobs: boolean;
  private connections: Set<WebSocket> = new Set();

  constructor(options: WSServerOptions = {}) {
    this.port = options.port ?? 8081;
    this.runJobs = options.runJobs ?? true;
    const baseDir = options.baseDir ?? options.projectRoot ?? ".";
    this.jobService = new JobService(baseDir, {
      provider: options.provider,
      defaultAllowedTools: options.defaultAllowedTools ?? [],
    });
    const httpServer = http.createServer(this.#handleRequest.bind(this));
    this.server = httpServer;
    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on("connection", this.#onConnection.bind(this));
    this.server.on("upgrade", this.#handleUpgrade.bind(this));
  }

  async listen(port?: number): Promise<number> {
    const p = port ?? this.port;
    await this.jobService.initialize();
    if (this.runJobs) {
      await this.jobService.start().catch((err) => {
        console.error(`job runner stopped: ${err?.message ?? err}`);
      });
    }
    return new Promise((resolve, reject) => {
      this.server.listen(p, "127.0.0.1", () => {
        const bound = this.server.address();
        if (bound && typeof bound === "object") this.port = bound.port;
        console.log(`WS Server listening on http://127.0.0.1:${this.port}`);
        resolve(this.port);
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
    await this.jobService.stop();
    this.connections.clear();
  }

  private #handleRequest(_req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  }

  private #handleUpgrade(req: http.IncomingMessage, socket: http.Socket, head: Buffer): void {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit("connection", ws, req);
    });
  }

  private #onConnection(ws: WebSocket): void {
    this.connections.add(ws);
    console.log(`WebSocket connected. Total connections: ${this.connections.size}`);

    ws.on("message", async (data) => {
      const message = data.toString();
      try {
        const parsed = JSON.parse(message);
        await this.#handleMessage(ws, parsed);
      } catch (e) {
        ws.send(JSON.stringify({ error: { message: "Invalid JSON" } }));
      }
    });

    ws.on("close", () => {
      this.connections.delete(ws);
      console.log(`WebSocket disconnected. Total connections: ${this.connections.size}`);
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  }

  private async #handleMessage(ws: WebSocket, message: any): Promise<void> {
    const { type, jobId, ...data } = message;

    switch (type) {
      case "subscribe": {
        if (!jobId) {
          ws.send(JSON.stringify({ error: { message: "jobId required" } }));
          return;
        }
        const job = await this.jobService.getJob(jobId);
        if (!job) {
          ws.send(JSON.stringify({ error: { message: "Job not found" } }));
          return;
        }
        ws.send(JSON.stringify({
          type: "job:status",
          jobId: job.jobId,
          status: job.status,
          progress: job.progress,
        }));
        break;
      }

      case "progress": {
        if (!jobId) {
          ws.send(JSON.stringify({ error: { message: "jobId required" } }));
          return;
        }
        await this.jobService.update(jobId as string, (job) => ({
          ...job,
          progress: data.progress,
          updatedAt: new Date().toISOString(),
        }));
        const job = await this.jobService.getJob(jobId as string);
        if (job) {
          this.broadcast({
            type: "job:progress",
            jobId: job.jobId,
            progress: job.progress,
          });
        }
        break;
      }

      case "complete": {
        if (!jobId) {
          ws.send(JSON.stringify({ error: { message: "jobId required" } }));
          return;
        }
        await this.jobService.finalize(jobId as string, "user", "completed");
        const job = await this.jobService.getJob(jobId as string);
        if (job) {
          this.broadcast({
            type: "job:complete",
            jobId: job.jobId,
            result: job.result,
          });
        }
        break;
      }

      case "cancel": {
        if (!jobId) {
          ws.send(JSON.stringify({ error: { message: "jobId required" } }));
          return;
        }
        await this.jobService.cancelJob(jobId as string);
        const job = await this.jobService.getJob(jobId as string);
        if (job) {
          this.broadcast({
            type: "job:cancel",
            jobId: job.jobId,
          });
        }
        break;
      }

      default:
        ws.send(JSON.stringify({ error: { message: `Unknown message type: ${type}` } }));
    }
  }

  private broadcast(message: { type: string; jobId: string; [key: string]: unknown }): void {
    const data = JSON.stringify(message);
    for (const connection of this.connections) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(data);
      }
    }
  }
}

export function createWSServer(options: WSServerOptions = {}): WSServer {
  return new WSServer(options);
}