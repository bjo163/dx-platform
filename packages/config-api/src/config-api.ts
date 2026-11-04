import { readConfig, writeConfig } from "@neuralforge/shared/paths";

export interface RuntimeConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  browser?: boolean;
  [key: string]: unknown;
}

export interface ConfigUpdateRequest {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  browser?: boolean;
  [key: string]: unknown;
}

export interface ConfigUpdateResponse {
  config: RuntimeConfig;
  updatedAt: string;
  source: "environment" | "runtime";
}

export interface ConfigAPIOptions {
  configDir?: string;
  defaultConfig?: Partial<RuntimeConfig>;
}

export class ConfigAPI {
  private configDir: string;
  private defaultConfig: Partial<RuntimeConfig>;
  private currentConfig: RuntimeConfig;

  constructor(options: ConfigAPIOptions = {}) {
    this.configDir = options.configDir ?? ".neuralforge";
    this.defaultConfig = options.defaultConfig ?? {};
    this.currentConfig = this.#loadConfig();
  }

  #loadConfig(): RuntimeConfig {
    const envConfig = this.#loadFromEnvironment();
    const fileConfig = this.#loadFromFile();
    return this.#mergeConfigs(this.defaultConfig, fileConfig, envConfig);
  }

  #loadFromEnvironment(): Partial<RuntimeConfig> {
    const config: Partial<RuntimeConfig> = {};
    if (process.env.WTAGENT_PROVIDER) config.provider = process.env.WTAGENT_PROVIDER;
    if (process.env.WTAGENT_MODEL) config.model = process.env.WTAGENT_MODEL;
    if (process.env.WTAGENT_TEMPERATURE) config.temperature = Number(process.env.WTAGENT_TEMPERATURE);
    if (process.env.WTAGENT_MAX_TOKENS) config.maxTokens = Number(process.env.WTAGENT_MAX_TOKENS);
    if (process.env.WTAGENT_API_KEY) config.apiKey = process.env.WTAGENT_API_KEY;
    if (process.env.WTAGENT_BROWSER) config.browser = process.env.WTAGENT_BROWSER === "true";
    return config;
  }

  #loadFromFile(): Partial<RuntimeConfig> {
    try {
      return readConfig(this.configDir, "config.json") as Partial<RuntimeConfig>;
    } catch {
      return {};
    }
  }

  #mergeConfigs(...configs: Partial<RuntimeConfig>[]): RuntimeConfig {
    return configs.reduce((acc, config) => {
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined) {
          (acc as Record<string, unknown>)[key] = value;
        }
      }
      return acc;
    }, {} as RuntimeConfig);
  }

  getConfig(): RuntimeConfig {
    return { ...this.currentConfig };
  }

  async updateConfig(request: ConfigUpdateRequest): Promise<ConfigUpdateResponse> {
    const merged = this.#mergeConfigs(this.currentConfig, request);
    await writeConfig(this.configDir, "config.json", merged);
    this.currentConfig = merged;
    return {
      config: { ...this.currentConfig },
      updatedAt: new Date().toISOString(),
      source: "runtime",
    };
  }

  async resetToDefaults(): Promise<ConfigUpdateResponse> {
    const envConfig = this.#loadFromEnvironment();
    this.currentConfig = this.#mergeConfigs(this.defaultConfig, envConfig);
    await writeConfig(this.configDir, "config.json", this.currentConfig);
    return {
      config: { ...this.currentConfig },
      updatedAt: new Date().toISOString(),
      source: "environment",
    };
  }
}

export function createConfigAPI(options: ConfigAPIOptions = {}): ConfigAPI {
  return new ConfigAPI(options);
}