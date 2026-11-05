import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { restoreWTagentBackup } from "@dx-platform/database";

const command = process.argv[2];
const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.WTAGENT_PROJECT_ROOT
  ?? path.resolve(apiDirectory, "..", "..", "..");
const dataDir = process.env.WTAGENT_DATA_DIR ?? path.join(projectRoot, ".neuralforge");

async function assertApiIsStopped(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Could not verify that the NeuralForge API is stopped; restore was cancelled."));
    }, 1_000);
    const finish = (callback: () => void) => {
      clearTimeout(timeout);
      callback();
    };

    socket.once("connect", () => {
      socket.destroy();
      finish(() => reject(new Error("Stop the NeuralForge API before restoring a backup.")));
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ECONNREFUSED") {
        finish(resolve);
      } else {
        finish(() => reject(error));
      }
    });
  });
}

if (command === "backup") {
  const port = Number(process.env.PORT ?? "8080");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError("PORT must be a valid TCP port.");
  }
  const response = await fetch(`http://127.0.0.1:${port}/v1/backups`, { method: "POST" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Backup request failed with HTTP ${response.status}: ${body}`);
  }
  const result = await response.json() as { path: string; createdAt: string; fileCount: number; totalBytes: number };
  console.info(`NeuralForge backup created: ${result.path}`);
  console.info(`Created at ${result.createdAt}; ${result.fileCount} files, ${result.totalBytes} bytes.`);
} else if (command === "restore") {
  const backupDir = process.argv[3];
  if (!backupDir) {
    throw new Error("Usage: pnpm --filter @dx-platform/api restore -- <backup-directory>");
  }

  const port = Number(process.env.PORT ?? "8080");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError("PORT must be a valid TCP port.");
  }
  await assertApiIsStopped(port);

  const result = await restoreWTagentBackup({
    backupDir,
    dataDir: path.join(dataDir, "data"),
    sessionsDir: path.join(dataDir, "sessions"),
  });
  console.info(`Restored NeuralForge backup from ${result.backupCreatedAt}.`);
  console.info(`Restored ${result.restoredFiles} files.`);
  if (result.previousDataDir) console.info(`Previous database preserved at ${result.previousDataDir}.`);
  if (result.previousSessionsDir) console.info(`Previous sessions preserved at ${result.previousSessionsDir}.`);
} else {
  throw new Error("Usage: pnpm --filter @dx-platform/api backup | restore -- <backup-directory>");
}
