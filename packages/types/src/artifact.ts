// Artifact store types.

export type ArtifactType = "image" | "music";

export interface ArtifactRecord {
  id: string;
  type: ArtifactType;
  localPath: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  hasVideo?: boolean | null;
  size: number;
  sha256: string;
  provenance?: Record<string, unknown> | null;
}

export interface ImageInspection {
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  size: number;
  sha256: string;
}

export interface MusicInspection {
  mimeType: string;
  extension: string;
  durationSeconds: number;
  hasVideo: boolean;
  size: number;
  sha256: string;
}

export interface ArtifactStoreOptions {
  projectRoot: string;
  allowOutside?: boolean;
}

export interface SaveProvenance {
  [key: string]: unknown;
}
