import { spawn } from "node:child_process";
import { discoverChromeExecutable } from "@dx-platform/platform";
import { ensureDirectory } from "@dx-platform/platform";
import { killProcessTree } from "@dx-platform/tools";

export async function launchNativeLoginBrowser({
  profileDir,
  chromePath,
  url = "https://chatgpt.com/",
}: any) {
  await ensureDirectory(profileDir);
  const executablePath = discoverChromeExecutable(chromePath);
  const child = spawn(
    executablePath,
    [
      `--user-data-dir=${profileDir}`,
      "--profile-directory=Default",
      "--no-first-run",
      "--no-default-browser-check",
      url,
    ],
    {
      detached: process.platform !== "win32",
      stdio: "ignore",
      windowsHide: false,
    },
  );

  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });

  return {
    pid: child.pid,
    async close() {
      await killProcessTree(child.pid);
      await new Promise<void>((resolve) => {
        if (child.exitCode != null || child.signalCode != null) {
          resolve();
          return;
        }
        child.once("close", resolve);
        setTimeout(resolve, 3_000).unref?.();
      });
    },
  };
}

