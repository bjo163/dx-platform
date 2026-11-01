import { spawn } from "node:child_process";

export async function killProcessTree(
  pid: number | undefined,
  signal: NodeJS.Signals = "SIGTERM",
  {
    platform = process.platform,
    spawnImpl = spawn,
  }: {
    platform?: NodeJS.Platform;
    spawnImpl?: typeof spawn;
  } = {},
): Promise<void> {
  if (!pid) {
    return;
  }

  if (platform === "win32") {
    await new Promise((resolve) => {
      const child = spawnImpl(
        "taskkill",
        ["/pid", String(pid), "/T", "/F"],
        { windowsHide: true, stdio: "ignore" },
      );
      child.once("close", resolve);
      child.once("error", resolve);
    });
    return;
  }

  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // The process may already be gone.
    }
  }
}

