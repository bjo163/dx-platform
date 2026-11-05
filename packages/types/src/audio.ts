// Music generation types.

export type MusicGenerationType = "music" | "song" | "soundtrack" | "jingle" | "effect";

export interface MusicCapabilities {
  generate: boolean;
}

export interface MusicRequest {
  prompt: string;
  outputPath: string;
  provider: string;
  generationType?: MusicGenerationType;
}

export interface MusicCapabilitiesResult {
  generate: boolean;
}

export interface MusicDriver {
  readonly provider: string;
  capabilities(): MusicCapabilitiesResult;
  generate(request: MusicRequest, context: MusicGenerateContext): Promise<MusicGenerateResult>;
}

export interface MusicGenerateContext {
  runAuxiliaryTurn: (options: unknown) => Promise<unknown>;
}

export interface MusicGenerateResult {
  type: "music" | "text";
  sourcePath?: string;
  provenance?: Record<string, unknown>;
  cleanup?: (() => Promise<void>) | null;
  message?: string;
}

export interface MusicReceiverContext {
  projectRoot: string;
  handoffId: string;
  assistantMessageId?: string | null;
}

export interface MusicArtifact {
  id: string;
  type: "music";
  localPath: string;
  mimeType: string;
  durationSeconds: number;
  hasVideo: boolean;
  size: number;
  sha256: string;
  provenance?: Record<string, unknown> | null;
  audioExtractionNote?: string | null;
}

export interface MusicRunResult {
  message: string;
  artifacts: MusicArtifact[];
}
