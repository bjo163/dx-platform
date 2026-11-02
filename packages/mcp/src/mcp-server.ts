import { MCP_CORE_TOOLS, type MCPToolName } from "./tool-definitions.js";

// JSON-RPC 2.0 types
export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: unknown;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

function buildRPCResult(id: string | number | null, result: unknown): MCPResponse {
  return { jsonrpc: "2.0", id, result };
}

function buildRPCError(id: string | number | null, code: number, message: string): MCPResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function dispatchToolCall(
  method: string,
  params: unknown,
): Promise<{
  ok: boolean;
  message: string;
  data?: unknown;
  stdout?: string | null;
  stderr?: string | null;
}> {
  if (!method.startsWith("mcp/")) {
    throw new Error(`Unknown method: ${method}`);
  }

  const toolName = method.slice(4) as MCPToolName;

  if (!(toolName in MCP_CORE_TOOLS)) {
    throw new Error(`Unknown MCP tool: ${toolName}`);
  }

  const tool = MCP_CORE_TOOLS[toolName];
  const result = await tool.execute(params as any);
  return result;
}

export class MCPServer {
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    // Handle built-in methods
    if (request.method === "initialize") {
      return buildRPCResult(request.id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: { name: "wtagent-mcp", version: "1.0.0" },
      });
    }

    if (request.method === "initialized") {
      return { jsonrpc: "2.0", id: request.id, result: undefined };
    }

    if (request.method === "shutdown") {
      return buildRPCResult(request.id, { acknowledged: true });
    }

    if (request.method === "exit") {
      return { jsonrpc: "2.0", id: request.id, result: undefined };
    }

    // Handle registered tools (mcp/<name>)
    if (request.method.startsWith("mcp/")) {
      const params = request.params ?? {};
      try {
        const result = await dispatchToolCall(request.method, params);
        return buildRPCResult(request.id, result);
      } catch (err: any) {
        return buildRPCError(request.id, -32603, err.message ?? "Unknown tool error");
      }
    }

    return buildRPCError(request.id, -32600, `Invalid method: ${request.method}`);
  }

  async parseAndHandle(raw: string): Promise<MCPResponse> {
    try {
      const req = JSON.parse(raw) as MCPRequest;
      return await this.handleRequest(req);
    } catch (err) {
      return { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } };
    }
  }

  async run(): Promise<void> {
    const readline = require("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const response = await this.parseAndHandle(trimmed);
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  }
}

export function createDefaultMCPServer(): MCPServer {
  return new MCPServer();
}

export interface MCPToolCall {
  name: string;
  args?: Record<string, unknown>;
}

export interface MCPToolResult {
  ok: boolean;
  message?: string;
  data?: unknown;
  stdout?: string | null;
  stderr?: string | null;
}
