import fs from "node:fs/promises";
import path from "node:path";
import { writeConfig } from "@dx-platform/shared/paths";

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  tools: PluginTool[];
  permissions: string[];
  manifestVersion: number;
}

export interface PluginConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface PluginContext {
  pluginName: string;
  configDir: string;
  [key: string]: unknown;
}

export interface PluginTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface PluginSystemOptions {
  pluginDir?: string;
}

export class PluginSystem {
  private pluginDir: string;
  private plugins: Map<string, PluginManifest> = new Map();
  private configs: Map<string, PluginConfig> = new Map();

  constructor(options: PluginSystemOptions = {}) {
    this.pluginDir = options.pluginDir ?? ".neuralforge/plugins";
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.pluginDir, { recursive: true });
    await this.#loadPlugins();
    await this.#loadConfigs();
  }

  async #loadPlugins(): Promise<void> {
    try {
      const entries = await fs.readdir(this.pluginDir);
      for (const entry of entries) {
        const pluginPath = path.join(this.pluginDir, entry);
        const stat = await fs.stat(pluginPath);
        if (stat.isDirectory()) {
          const manifestPath = path.join(pluginPath, "manifest.json");
          try {
            const manifest = await this.#readManifest(manifestPath);
            if (manifest) {
              this.plugins.set(manifest.name, manifest);
            }
          } catch {
            // Skip plugins with invalid manifests
          }
        }
      }
    } catch (error) {
      if ((error as { code?: string }).code !== "ENOENT") throw error;
    }
  }

  async #readManifest(path: string): Promise<PluginManifest | null> {
    try {
      const content = await fs.readFile(path, "utf8");
      return JSON.parse(content) as PluginManifest;
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return null;
      throw error;
    }
  }

  async #loadConfigs(): Promise<void> {
    for (const [name] of this.plugins) {
      try {
        const configPath = path.join(this.pluginDir, name, "config.json");
        const config = await this.#readConfig(configPath);
        this.configs.set(name, config ?? { enabled: true });
      } catch (error) {
        if ((error as { code?: string }).code !== "ENOENT") {
          this.configs.set(name, { enabled: true });
        }
      }
    }
  }

  async #readConfig(path: string): Promise<PluginConfig | null> {
    try {
      const content = await fs.readFile(path, "utf8");
      return JSON.parse(content) as PluginConfig;
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return null;
      throw error;
    }
  }

  getPlugin(name: string): PluginManifest | undefined {
    return this.plugins.get(name);
  }

  listPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  async getPluginConfig(name: string): Promise<PluginConfig> {
    return this.configs.get(name) ?? { enabled: true };
  }

  async updatePluginConfig(name: string, config: PluginConfig): Promise<void> {
    if (!this.plugins.has(name)) {
      throw new Error(`Plugin ${name} not found`);
    }
    this.configs.set(name, config);
    await writeConfig(path.join(this.pluginDir, name), "config.json", config);
  }

  async registerPlugin(manifest: PluginManifest): Promise<void> {
    if (manifest.manifestVersion !== 1) {
      throw new Error(`Unsupported manifest version: ${manifest.manifestVersion}`);
    }
    const pluginPath = path.join(this.pluginDir, manifest.name);
    await fs.mkdir(pluginPath, { recursive: true });
    await writeConfig(pluginPath, "manifest.json", manifest);
    this.plugins.set(manifest.name, manifest);
    this.configs.set(manifest.name, { enabled: true });
  }
}

export function createPluginSystem(options: PluginSystemOptions = {}): PluginSystem {
  return new PluginSystem(options);
}
