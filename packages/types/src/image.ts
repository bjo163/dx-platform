// Image generation types.

export type ImageProvider = "chatgpt" | "gemini" | "grok" | "auto";

export interface ImageRequest {
  prompt: string;
  outputPath: string;
  provider: ImageProvider;
  aspectRatio?: string;
  referenceImages?: string[];
}

export interface ImageCapabilities {
  generate: boolean;
  referenceImages: boolean;
  aspectRatios: string[];
}

export interface ImageDriver {
  readonly provider: string;
  capabilities(): ImageCapabilities;
  generate(request: ImageRequest, context: ImageGenerateContext): Promise<ImageGenerateResult>;
}

export interface ImageGenerateContext {
  runAuxiliaryTurn: (options: unknown) => Promise<unknown>;
}

export interface ImageGenerateResult {
  type: "image" | "text";
  sourcePath?: string;
  provenance?: Record<string, unknown>;
  cleanup?: (() => Promise<void>) | null;
  message?: string;
}

export interface ImageProviderRecord {
  provider: string;
  adapter: unknown;
  ownsWindow?: boolean;
}

export interface ImageServiceContext {
  projectRoot: string;
  allowOutside: boolean;
  runAuxiliaryTurn: (options: unknown) => Promise<unknown>;
}