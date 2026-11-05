import { createInterface } from "node:readline";
import { PolicyEngine } from "@dx-platform/policy";
import { ProcessManager } from "@dx-platform/tools";
import { createDefaultToolRegistry } from "@dx-platform/tools";
import type { ToolRegistry } from "@dx-platform/tools";
import { NeuralForgeError } from "@dx-platform/shared";
import { resolveLimits, type Limits } from "@dx-platform/shared";
import { getPackageVersion } from "@dx-platform/shared";
import { listMCPTools, mcpErrorResult, toMCPToolResult } from "./tool-definitions.js";

// JSON-RPC 2.0 types
export interface MCPRequest {
  jsonrpc?: "2.0";
  id?: string | number | null;
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

export type { MCPContentBlock, MCPToolCallResult, MCPToolDescriptor } from "./tool-definitions.js";

// The revision every current MCP host negotiates down to without a capability
// preflight beyond `tools`.
export const MCP_PROTOCOL_VERSION = "2024-11-05";

const PARSE_ERROR = -32700;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

function buildRPCResult(id: string | number | null, result: unknown): MCPResponse {
  return { jsonrpc: "2.0", id, result };
}

function buildRPCError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): MCPResponse {
  return { jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } };
}

export interface MCPServerOptions {
  projectRoot?: string;
  registry?: ToolRegistry;
  policy?: PolicyEngine;
  limits?: Limits;
  // Tools the host may run even though policy would otherwise ask a human.
  // Nothing here prompts, so an unlisted write or shell is refused.
  allowedTools?: readonly string[];
  sessionId?: string;
}

export class MCPServer {
  readonly projectRoot: string;
  readonly registry: ToolRegistry;
  readonly policy: PolicyEngine;
  readonly limits: Limits;
  readonly allowedTools: Set<string>;
  readonly sessionId: string;
  #calls = 0;

  constructor({
    projectRoot = process.cwd(),
    limits = resolveLimits(),
    registry = createDefaultToolRegistry({ processManager: new ProcessManager(), limits }),
    policy = new PolicyEngine(),
    allowedTools = [],
    sessionId = `mcp_${process.pid}`,
  }: MCPServerOptions = {}) {
    this.projectRoot = projectRoot;
    this.registry = registry;
    this.policy = policy;
    this.limits = limits;
    this.allowedTools = new Set(allowedTools);
    this.sessionId = sessionId;
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse | null> {
    // A JSON-RPC notification carries no id and must not be answered; replying
    // to one makes a host treat the stream as corrupt.
    if (request.id == null) return null;
    const id = request.id;
    switch (request.method) {
      case "initialize":
        return buildRPCResult(id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "neuralforge-mcp", version: getPackageVersion() },
        });
      case "ping":
        return buildRPCResult(id, {});
      case "shutdown":
        return buildRPCResult(id, { acknowledged: true });
      case "tools/list":
        return buildRPCResult(id, { tools: listMCPTools(this.registry) });
      case "tools/call":
        return this.#handleToolCall(id, request.params);
      default:
        return buildRPCError(id, METHOD_NOT_FOUND, `Method not found: ${request.method}`);
    }
  }

  async #handleToolCall(id: string | number, params: unknown): Promise<MCPResponse> {
    const call = (params ?? {}) as {
      name?: unknown;
      arguments?: Record<string, unknown> | null;
    };
    if (typeof call.name !== "string" || !call.name) {
      return buildRPCError(id, INVALID_PARAMS, "`name` must be a string.");
    }
    // The assertion above is only the shape we hope for; a host can still put an
    // array or a scalar where the spec wants an object.
    if (call.arguments != null
      && (typeof call.arguments !== "object" || Array.isArray(call.arguments))) {
      return buildRPCError(id, INVALID_PARAMS, "`arguments` must be an object.");
    }
    const args = call.arguments ?? {};
    if (!this.registry.list().some((tool) => tool.name === call.name)) {
      return buildRPCError(id, INVALID_PARAMS, `Unknown tool: ${call.name}`);
    }

    const callKey = `${this.sessionId}_call_${++this.#calls}`;
    let prepared: ReturnType<ToolRegistry["validate"]>;
    try {
      prepared = this.registry.validate({ id: callKey, name: call.name, args });
    } catch (error) {
      return buildRPCResult(id, mcpErrorResult((error as Error)?.message ?? String(error)));
    }

    const decision = await this.policy.evaluate(prepared, { projectRoot: this.projectRoot });
    const reasons = decision.reasons.join("; ") || decision.action;
    if (decision.action === "deny") {
      return buildRPCResult(id, mcpErrorResult(`${prepared.name} is denied: ${reasons}.`));
    }
    if (decision.action === "confirm" && !this.allowedTools.has(prepared.name)) {
      return buildRPCResult(id, mcpErrorResult(
        `${prepared.name} needs confirmation: ${reasons}. `
          + "This server has no interactive approver; start it with that tool in `allowedTools` to grant it.",
      ));
    }

    const result = await this.registry.execute(prepared, {
      projectRoot: this.projectRoot,
      allowOutside: decision.grants?.allowOutside ?? false,
      toolTimeoutMs: this.limits.toolTimeoutMs,
      sessionId: this.sessionId,
      operationKey: callKey,
      requestSignature: callKey,
      runAuxiliaryTurn: async () => {
        throw new NeuralForgeError(
          "This tool needs a model turn, but an MCP host supplies no browser session.",
          { code: "AUXILIARY_TURN_UNAVAILABLE", recoverable: false },
        );
      },
      onToolOutput: async () => {},
    });
    return buildRPCResult(id, toMCPToolResult(result));
  }

  async parseAndHandle(raw: string): Promise<MCPResponse | null> {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    let request: MCPRequest;
    try {
      request = JSON.parse(trimmed) as MCPRequest;
    } catch {
      return buildRPCError(null, PARSE_ERROR, "Parse error");
    }
    if (typeof request?.method !== "string") {
      return buildRPCError(request?.id ?? null, INVALID_PARAMS, "A request needs a `method` string.");
    }
    try {
      return await this.handleRequest(request);
    } catch (error) {
      return buildRPCError(request.id ?? null, INTERNAL_ERROR, (error as Error)?.message ?? String(error));
    }
  }

  async run({
    input = process.stdin,
    output = process.stdout,
  }: {
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
  } = {}): Promise<void> {
    const rl = createInterface({ input, crlfDelay: Infinity });
    for await (const line of rl) {
      const response = await this.parseAndHandle(line);
      // One message per line is the whole framing of the stdio transport.
      if (response) output.write(`${JSON.stringify(response)}\n`);
    }
  }
}

export function createDefaultMCPServer(options: MCPServerOptions = {}): MCPServer {
  return new MCPServer(options);
}
