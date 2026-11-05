import path from "node:path";
import fs from "node:fs/promises";
import { replaceFileAtomic } from "./atomic-write.js";

export interface PathsOptions {
  configDir?: string;
}

export async function readConfig<T = unknown>(configDir: string, fileName: string): Promise<T> {
  const filePath = path.join(configDir, fileName);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return {} as T;
    }
    throw error;
  }
}

export async function writeConfig(configDir: string, fileName: string, data: unknown): Promise<void> {
  await fs.mkdir(configDir, { recursive: true, mode: 0o700 });
  const filePath = path.join(configDir, fileName);
  const temporary = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await replaceFileAtomic(temporary, filePath);
}

export async function readJsonFile<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await replaceFileAtomic(temporary, filePath);
}
