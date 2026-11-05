import fs from "node:fs/promises";

const WINDOWS_RETRYABLE_RENAME_CODES = new Set([
  "EACCES",
  "EBUSY",
  "EPERM",
]);

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// Node's Windows rename uses the native replace operation, but antivirus and
// file indexers can briefly hold the destination open. Retry that atomic
// operation instead of deleting the old destination first: persistent failure
// must leave the previous complete file intact.
export async function replaceFileAtomic(temporary: string, destination: string, {
  platform = process.platform,
  rename = fs.rename,
  attempts = 5,
  retryDelayMs = 20,
} = {}): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await rename(temporary, destination);
      return;
    } catch (error) {
      lastError = error;
      const errorCode = (error as { code?: string }).code;
      const retryable = platform === "win32"
        && errorCode != null
        && WINDOWS_RETRYABLE_RENAME_CODES.has(errorCode)
        && attempt + 1 < attempts;
      if (!retryable) {
        throw error;
      }
      await wait(retryDelayMs * (attempt + 1));
    }
  }
  throw lastError;
}
