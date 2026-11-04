import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MCPServer } from "@wtagent/mcp";

test("debug cmd del grant", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wtagent-mcp-debug-"));
  fs.writeFileSync(path.join(root, "victim.txt"), "keep");
  const server = new MCPServer({ projectRoot: root, allowedTools: ["terminal.exec"] });
  const response = await server.handleRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "terminal.exec", arguments: { program: "cmd", argv: ["/c", "del", "victim.txt"], cwd: "." } } });
  console.log("RESPONSE:", JSON.stringify(response, null, 2));
  console.log("FILE_EXISTS:", fs.existsSync(path.join(root, "victim.txt")));
  fs.rmSync(root, { recursive: true, force: true });
});
