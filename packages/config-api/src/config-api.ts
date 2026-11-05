import { readConfig, writeConfig } from "@dx-platform/shared/paths";

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

  private constructor(configDir: string, defaultConfig: Partial<RuntimeConfig>, initialConfig: RuntimeConfig) {
    this.configDir = configDir;
    this.defaultConfig = defaultConfig;
    this.currentConfig = initialConfig;
  }

  static async create(options: ConfigAPIOptions = {}): Promise<ConfigAPI> {
    const configDir = options.configDir ?? ".neuralforge";
    const defaultConfig = options.defaultConfig ?? {};
    const envConfig = this.#loadFromEnvironment();
    const fileConfig = await this.#loadFromFile(configDir);
    const initialConfig = this.#mergeConfigs(defaultConfig, fileConfig, envConfig);
    return new ConfigAPI(configDir, defaultConfig, initialConfig);
  }

  static #loadFromEnvironment(): Partial<RuntimeConfig> {
    const config: Partial<RuntimeConfig> = {};
    if (process.env.WTAGENT_PROVIDER) config.provider = process.env.WTAGENT_PROVIDER;
    if (process.env.WTAGENT_MODEL) config.model = process.env.WTAGENT_MODEL;
    if (process.env.WTAGENT_TEMPERATURE) config.temperature = Number(process.env.WTAGENT_TEMPERATURE);
    if (process.env.WTAGENT_MAX_TOKENS) config.maxTokens = Number(process.env.WTAGENT_MAX_TOKENS);
    if (process.env.WTAGENT_API_KEY) config.apiKey = process.env.WTAGENT_API_KEY;
    if (process.env.WTAGENT_BROWSER) config.browser = process.env.WTAGENT_BROWSER === "true";
    return config;
  }

  static async #loadFromFile(configDir: string): Promise<Partial<RuntimeConfig>> {
    try {
      return await readConfig(configDir, "config.json") as Partial<RuntimeConfig>;
    } catch {
      return {};
    }
  }

  static #mergeConfigs(...configs: Partial<RuntimeConfig>[]): RuntimeConfig {
    return configs.reduce((acc: RuntimeConfig, config: Partial<RuntimeConfig>) => {
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined) {
          acc[key] = value;
        }
      }
      return acc;
    }, { provider: "", model: "" } as RuntimeConfig);
  }

  getConfig(): RuntimeConfig {
    return { ...this.currentConfig };
  }

  async updateConfig(request: ConfigUpdateRequest): Promise<ConfigUpdateResponse> {
    const merged = ConfigAPI.#mergeConfigs(this.currentConfig, request);
    await writeConfig(this.configDir, "config.json", merged);
    this.currentConfig = merged;
    return {
      config: { ...this.currentConfig },
      updatedAt: new Date().toISOString(),
      source: "runtime",
    };
  }

  async resetToDefaults(): Promise<ConfigUpdateResponse> {
    const envConfig = ConfigAPI.#loadFromEnvironment();
    this.currentConfig = ConfigAPI.#mergeConfigs(this.defaultConfig, envConfig);
    await writeConfig(this.configDir, "config.json", this.currentConfig);
    return {
      config: { ...this.currentConfig },
      updatedAt: new Date().toISOString(),
      source: "environment",
    };
  }
}

export function createConfigAPI(options: ConfigAPIOptions = {}): Promise<ConfigAPI> {
  return ConfigAPI.create(options);
}
