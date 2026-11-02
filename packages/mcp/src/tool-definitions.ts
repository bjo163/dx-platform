export interface MCPRegisteredTool<Args extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  description: string;
  execute(args: Args): Promise<{
    ok: boolean;
    message?: string;
    data?: unknown;
    stdout?: string | null;
    stderr?: string | null;
  }>;
}

// ── Pre-registered core tools ──────────────────────────────────────────

export const MCP_CORE_TOOLS = {
  /** List files and directories. */
  list: {
    name: "fs.list",
    description: "List entries in a directory.",
    execute: async (args: { path: string }) => {
      const fs = require("node:fs/promises");
      const entries = await fs.readdir(args.path, { withFileTypes: true });
      return {
        ok: true,
        message: "listed",
        data: entries.map((e: any) => ({ name: e.name, type: e.type === "directory" ? "dir" : "file" })),
      };
    },
  },

  /** Read a file. */
  read: {
    name: "fs.read",
    description: "Read a file's contents.",
    execute: async (args: { path: string }) => {
      const fs = require("node:fs/promises");
      const data = await fs.readFile(args.path, "utf8");
      return { ok: true, message: "read", data };
    },
  },

  /** Write a file. */
  write: {
    name: "fs.write",
    description: "Write content to a file (creates or overwrites).",
    execute: async (args: { path: string; content: string }) => {
      const fs = require("node:fs/promises");
      await fs.writeFile(args.path, args.content);
      return { ok: true, message: "written" };
    },
  },

  /** Execute a terminal command. */
  exec: {
    name: "terminal.exec",
    description: "Run a command in a shell and capture stdout/stderr.",
    execute: async (args: { program: string; argv?: string[]; cwd?: string }) => {
      const { execFile } = require("node:child_process");
      try {
        const result = await execFile(
          args.program,
          args.argv ?? [],
          { cwd: args.cwd || process.cwd() },
        );
        return { ok: true, message: "executed", stdout: result.stdout, stderr: result.stderr };
      } catch (e: any) {
        return { ok: false, message: e.message, stderr: e.stack };
      }
    },
  },

  /** Get process information. */
  process: {
    name: "process.info",
    description: "Get current process info.",
    execute: async () => {
      return {
        ok: true,
        message: "fetched",
        data: {
          pid: process.pid,
          title: process.title,
          platform: process.platform,
          version: process.version,
        },
      };
    },
  },

  /** Generate an image. */
  generate: {
    name: "image.generate",
    description: "Generate an image via the native image provider.",
    execute: async (args: { prompt: string; output_path?: string }) => {
      // Stub - would use native image service
      return { ok: true, message: "generated", data: { placeholder: true } };
    },
  },
} as const;

export type MCPToolName = keyof typeof MCP_CORE_TOOLS;
