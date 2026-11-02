#!/usr/bin/env node
import path from "node:path";
import { MCPServer } from "./mcp-server.js";

const USAGE = `wtagent-mcp [options]

  --project <dir>   Project root the tools may reach (default: current directory)
  --allow <tools>   Comma-separated tools to grant without a human, e.g. fs.write,terminal.exec
  --help            Show this message
`;

function parseArgs(argv: string[]): { projectRoot: string; allowedTools: string[] } {
  const options = { projectRoot: process.cwd(), allowedTools: [] as string[] };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") {
      process.stdout.write(USAGE);
      process.exit(0);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("-")) {
      process.stderr.write(`${flag} needs a value.\n\n${USAGE}`);
      process.exit(2);
    }
    if (flag === "--project") {
      options.projectRoot = path.resolve(value);
      index += 1;
    } else if (flag === "--allow") {
      options.allowedTools.push(...value.split(",").map((name) => name.trim()).filter(Boolean));
      index += 1;
    } else {
      process.stderr.write(`Unknown option: ${flag}\n\n${USAGE}`);
      process.exit(2);
    }
  }
  return options;
}

const { projectRoot, allowedTools } = parseArgs(process.argv.slice(2));
await new MCPServer({ projectRoot, allowedTools }).run();
