import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { writeConfig, readConfig } from "@neuralforge/shared/paths";

export interface ModelProvider {
  name: "ollama" | "lmstudio";
  endpoint: string;
  model: string;
  capabilities: ModelCapability[];
}

export interface OllamaConfig {
  host: string;
  port: number;
  model: string;
  [key: string]: unknown;
}

export interface LMStudioConfig {
  host: string;
  port: number;
  model: string;
  [key: string]: unknown;
}

export interface ModelCapability {
  name: string;
  description: string;
}

export interface LocalModelSupportOptions {
  ollama?: OllamaConfig;
  lmstudio?: LMStudioConfig;
}

class LocalModelSupport {
  private ollama: OllamaConfig | undefined;
  private lmstudio: LMStudioConfig | undefined;

  constructor(options: LocalModelSupportOptions = {}) {
    this.ollama = options.ollama;
    this.lmstudio = options.lmstudio;
  }

  async isOllamaAvailable(): Promise<boolean> {
    if (!this.ollama) return false;
    try {
      const result = await this.#execCommand(`curl -s http://${this.ollama.host}:${this.ollama.port}/api/tags`);
      return result.status === 200;
    } catch {
      return false;
    }
  }

  async listOllamaModels(): Promise<string[]> {
    if (!this.ollama) return [];
    try {
      const result = await this.#execCommand(`curl -s http://${this.ollama.host}:${this.ollama.port}/api/tags`);
      const data = JSON.parse(result.data);
      return data.models?.map((m: any) => m.name) ?? [];
    } catch {
      return [];
    }
  }

  async isLMStudioAvailable(): Promise<boolean> {
    if (!this.lmstudio) return false;
    try {
      const result = await this.#execCommand(`curl -s http://${this.lmstudio.host}:${this.lmstudio.port}/v1/models`);
      return result.status === 200;
    } catch {
      return false;
    }
  }

  async listLMStudioModels(): Promise<string[]> {
    if (!this.lmstudio) return [];
    try {
      const result = await this.#execCommand(`curl -s http://${this.lmstudio.host}:${this.lmstudio.port}/v1/models`);
      const data = JSON.parse(result.data);
      return data.data?.map((m: any) => m.id) ?? [];
    } catch {
      return [];
    }
  }

  async generateWithOllama(prompt: string, model?: string): Promise<string> {
    const mdl = model ?? this.ollama?.model ?? "llama2";
    try {
      const result = await this.#execCommand(
        `curl -s -X POST http://${this.ollama.host}:${this.ollama.port}/api/generate -d '{"model":"${mdl}","prompt":"${prompt}"}'`
      );
      const parsed = JSON.parse(result.data);
      return parsed.response ?? "";
    } catch (error) {
      console.error("Ollama generation error:", error);
      return "";
    }
  }

  async generateWithLMStudio(prompt: string, model?: string): Promise<string> {
    const mdl = model ?? this.lmstudio?.model ?? "local-model";
    try {
      const result = await this.#execCommand(
        `curl -s -X POST http://${this.lmstudio.host}:${this.lmstudio.port}/v1/completions -d '{"model":"${mdl}","prompt":"${prompt}"}'`
      );
      const data = JSON.parse(result.data);
      return data?.choices?.[0]?.text ?? "";
    } catch (error) {
      console.error("LMStudio generation error:", error);
      return "";
    }
  }

  #execCommand(cmd: string): Promise<{ data: string; status: number }> {
    return new Promise((resolve, reject) => {
      exec(cmd, (error: any, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
        } else {
          resolve({ data: stdout, status: 200 });
        }
      });
    });
  }
}

export function createLocalModelSupport(options: LocalModelSupportOptions = {}): LocalModelSupport {
  return new LocalModelSupport(options);
}