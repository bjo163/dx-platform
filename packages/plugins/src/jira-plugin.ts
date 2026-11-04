import fs from "node:fs/promises";
import path from "node:path";
import { writeConfig, readConfig } from "@wtagent/shared/paths";

export const JiraPluginManifest = {
  name: "jira",
  version: "1.0.0",
  description: "Jira integration plugin",
  author: "WTAgent",
  tools: [],
  permissions: ["jira:read", "jira:write"],
  manifestVersion: 1,
};

export class JiraPlugin {
  private readonly pluginDir: string;

  constructor(pluginDir: string) {
    this.pluginDir = pluginDir;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.pluginDir, { recursive: true });
  }

  async getProjects(): Promise<string[]> {
    try {
      const config = await readConfig<string[]>(this.pluginDir, "projects.json");
      return config ?? [];
    } catch (error) {
      console.error("Error loading Jira projects:", error);
      return [];
    }
  }

  async saveProjects(projects: string[]): Promise<void> {
    try {
      await writeConfig(this.pluginDir, "projects.json", projects);
    } catch (error) {
      console.error("Error saving Jira projects:", error);
    }
  }
}