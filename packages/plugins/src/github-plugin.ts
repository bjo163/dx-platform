import fs from "node:fs/promises";
import path from "node:path";
import { writeConfig, readConfig } from "@dx-platform/shared/paths";

export const GitHubPluginManifest = {
  name: "github",
  version: "1.0.0",
  description: "GitHub integration plugin",
  author: "NeuralForge",
  tools: [],
  permissions: ["github:read", "github:write"],
  manifestVersion: 1,
};

export class GitHubPlugin {
  private readonly pluginDir: string;

  constructor(pluginDir: string) {
    this.pluginDir = pluginDir;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.pluginDir, { recursive: true });
  }

  async getRepositories(org: string): Promise<string[]> {
    try {
      // In a real implementation, this would use the GitHub API
      const config = await readConfig<string[]>(this.pluginDir, "repos.json");
      return config ?? [];
    } catch (error) {
      console.error("Error loading GitHub repos:", error);
      return [];
    }
  }

  async saveRepositories(org: string, repos: string[]): Promise<void> {
    try {
      const configPath = path.join(this.pluginDir, "repos.json");
      await writeConfig(this.pluginDir, "repos.json", repos);
    } catch (error) {
      console.error("Error saving GitHub repos:", error);
    }
  }
}
