import test from "../src/shim.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MCPServer, MCP_PROTOCOL_VERSION } from "@wtagent/mcp";

let nextId = 1;

async function harness(t, { allowedTools = [], files = {} } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wtagent-mcp-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(root, name), content);
  }
  const server = new MCPServer({ projectRoot: root, allowedTools });
  const send = (method, params = {}) => server.handleRequest({
    jsonrpc: "2.0",
    id: nextId++,
    method,
    params,
  });
  const call = (name, args) => send("tools/call", { name, arguments: args });
  const sendAs = (id, method, params = {}) =>
    server.handleRequest({ jsonrpc: "2.0", id, method, params });
  const textOf = (response) => response.result.content[0].text;
  return { root, server, send, sendAs, call, textOf };
}

const RM_ARGS = { program: "rm", argv: ["-rf", "victim.txt"], cwd: "." };

test("initialize answers with the version and capabilities a host negotiates", async (t) => {
  const { send } = await harness(t);
  const response = await send("initialize", {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: "probe", version: "1" },
  });

  assert.equal(response.result.protocolVersion, MCP_PROTOCOL_VERSION);
  assert.deepEqual(response.result.capabilities, { tools: { listChanged: false } });
  assert.equal(response.result.serverInfo.name, "wtagent-mcp");
  assert.match(response.result.serverInfo.version, /^\d+\.\d+\.\d+/);
});

test("a notification is acknowledged by silence, not by a reply", async (t) => {
  const { server } = await harness(t);
  const response = await server.parseAndHandle(JSON.stringify({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  }));
  assert.equal(response, null, "a framed reply to a notification corrupts the stream");
});

test("tools/list advertises every real tool with a JSON Schema", async (t) => {
  const { send } = await harness(t);
  const { tools } = (await send("tools/list")).result;
  const names = tools.map((tool) => tool.name);

  assert.ok(names.includes("fs.read") && names.includes("fs.list") && names.includes("terminal.exec"));
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, "object", `${tool.name} needs an object schema`);
    assert.ok(tool.description.length > 0, `${tool.name} needs a description`);
  }

  const read = tools.find((tool) => tool.name === "fs.read");
  assert.equal(read.inputSchema.properties.path.type, "string");
  assert.equal(read.inputSchema.properties.offset.type, "integer");
});

test("tools/call runs the same tool the agent runs", async (t) => {
  const { sendAs, root, textOf } = await harness(t, {
    files: { "note.txt": "hello from mcp\n" },
  });
  const response = await sendAs(77, "tools/call", {
    name: "fs.read",
    arguments: { path: "note.txt" },
  });

  assert.equal(response.result.isError, false);
  assert.match(textOf(response), /hello from mcp/);
  assert.match(textOf(response), /"nextOffset":15/);
  assert.equal(response.id, 77, "a reply must carry the id it was asked for");
  assert.equal(response.jsonrpc, "2.0");
  await fs.stat(path.join(root, "note.txt"));
});

test("an ungranted confirmation is refused and never executed", async (t) => {
  const { call, root, textOf } = await harness(t, { files: { "victim.txt": "keep" } });
  const response = await call("terminal.exec", RM_ARGS);

  assert.equal(response.result.isError, true);
  assert.match(textOf(response), /destructive command rm/);
  assert.match(textOf(response), /allowedTools/);
  await fs.readFile(path.join(root, "victim.txt"), "utf8");
});

test("an explicit grant lets the host run the tool it asked for", async (t) => {
  const { call, root, textOf } = await harness(t, {
    allowedTools: ["terminal.exec"],
    files: { "victim.txt": "keep" },
  });
  const response = await call("terminal.exec", RM_ARGS);

  assert.equal(response.result.isError, false);
  assert.match(textOf(response), /Command exited with 0/);
  await assert.rejects(fs.stat(path.join(root, "victim.txt")), { code: "ENOENT" });
});

test("a read outside the project stays refused without a grant", async (t) => {
  const { call, root, textOf } = await harness(t, { files: { "note.txt": "x" } });
  const outside = path.join(path.dirname(root), "outside.txt");
  const response = await call("fs.read", { path: outside });

  assert.equal(response.result.isError, true);
  assert.match(textOf(response), /outside the selected project/);
});

test("an unknown tool is a protocol error but a failed call is a result", async (t) => {
  const { call, send } = await harness(t, { files: { "note.txt": "x" } });

  const unknown = await send("tools/call", { name: "fs.frobnicate", arguments: {} });
  assert.equal(unknown.error.code, -32602);
  assert.match(unknown.error.message, /Unknown tool/);

  const badArgs = await call("fs.read", { path: 42 });
  assert.equal(badArgs.result.isError, true, "the model should see why the call failed");
  assert.match(badArgs.result.content[0].text, /Invalid arguments for fs.read/);
  assert.equal(badArgs.error, undefined);
});

test("malformed frames and unknown methods keep their JSON-RPC codes", async (t) => {
  const { server, send } = await harness(t);

  const broken = await server.parseAndHandle("{not json");
  assert.equal(broken.error.code, -32700);
  assert.equal(broken.id, null);

  const noMethod = await server.parseAndHandle(JSON.stringify({ jsonrpc: "2.0", id: 5 }));
  assert.equal(noMethod.error.code, -32602);

  const missingName = await send("tools/call", { arguments: {} });
  assert.equal(missingName.error.code, -32602);

  const arrayArgs = await send("tools/call", { name: "fs.read", arguments: ["note.txt"] });
  assert.equal(arrayArgs.error.code, -32602);

  const unknownMethod = await send("resources/list");
  assert.equal(unknownMethod.error.code, -32601);

  assert.equal((await send("ping")).result.constructor, Object);
});

test("the stdio entry point speaks MCP from a real process", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wtagent-mcp-proc-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, "note.txt"), "spawned\n");
  const entry = fileURLToPath(new URL("../../mcp/dist/main.js", import.meta.url));

  const child = spawn(process.execPath, [entry, "--project", root], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  t.after(() => { if (child.exitCode === null) child.kill(); });

  const frames = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "fs.read", arguments: { path: "note.txt" } } },
  ];
  for (const frame of frames) child.stdin.write(`${JSON.stringify(frame)}\n`);
  child.stdin.end();

  const exited = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`the server never exited: ${stderr}`)), 20_000);
    child.once("error", reject);
    child.once("exit", (code) => { clearTimeout(timer); resolve(code); });
  });
  assert.equal(exited, 0, stderr);
  assert.equal(stderr, "", "a working stdio server writes protocol frames, not complaints");

  const lines = stdout.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  assert.deepEqual(lines.map((line) => line.id), [1, 2], "the notification must not be answered");
  assert.match(lines[1].result.content[0].text, /spawned/);
});
