import type { ToolRegistry, ToolRunResult } from "@dx-platform/tools";

// MCP hosts are JSON-RPC clients that never see NeuralForge's XML envelope, so the
// bridge below turns the real tool registry into MCP descriptors and turns a
// tool run into MCP content blocks.

export interface MCPContentBlock {
  type: "text";
  text: string;
}

export interface MCPToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolCallResult {
  content: MCPContentBlock[];
  isError: boolean;
}

export function listMCPTools(registry: ToolRegistry): MCPToolDescriptor[] {
  return registry.describe().map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
}

// An MCP host shows `content` to a model or a human, so the message leads and
// the payload follows; `isError` carries the success bit the protocol asks for.
export function toMCPToolResult(result: ToolRunResult): MCPToolCallResult {
  const parts: string[] = [];
  if (result.message) parts.push(result.message);
  if (result.stdout) parts.push(result.stdout.replace(/\s+$/, ""));
  if (result.stderr) parts.push(result.stderr.replace(/\s+$/, ""));
  if (result.data != null) parts.push(JSON.stringify(result.data));
  if (parts.length === 0) parts.push(result.ok ? "ok" : "failed");
  return {
    content: [{ type: "text", text: parts.join("\n") }],
    isError: !result.ok,
  };
}

export function mcpErrorResult(text: string): MCPToolCallResult {
  return { content: [{ type: "text", text }], isError: true };
}
