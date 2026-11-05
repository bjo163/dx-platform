import http from "node:http";
import type { AddressInfo } from "node:net";

export interface FakeRequest {
  method: string;
  path: string;
  body: unknown;
}

export interface FakeProvider {
  host: string;
  port: number;
  requests: FakeRequest[];
  close(): Promise<void>;
}

interface Options {
  models?: string[];
  completion?: string;
}

// Tests must never reach a real model provider, and a loopback server is the
// only fake that exercises the HTTP boundary the production code actually uses.
export async function startFakeProvider(options: Options = {}): Promise<FakeProvider> {
  const models = options.models ?? ["llama3:8b"];
  const completion = options.completion ?? "answer from the fake provider";
  const requests: FakeRequest[] = [];

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let body: unknown = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        body = raw;
      }
      const path = (req.url ?? "").split("?")[0];
      requests.push({ method: req.method ?? "", path, body });

      const routes: Record<string, unknown> = {
        "/api/tags": { models: models.map((name) => ({ name })) },
        "/api/generate": { response: completion },
        "/v1/models": { data: models.map((id) => ({ id })) },
        "/v1/completions": { choices: [{ text: completion }] },
      };
      const payload = routes[path];
      if (!payload) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "unhandled route" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address() as AddressInfo;

  return {
    host: "127.0.0.1",
    port,
    requests,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
