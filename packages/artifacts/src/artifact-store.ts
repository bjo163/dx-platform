import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { replaceFileAtomic } from "@wtagent/shared/atomic-write";
import { inspectMusicBuffer } from "./music-artifact.js";
import {
  resolveCanonicalWriteTarget,
  resolveToolPath,
} from "@wtagent/policy/path-guard";
import type {
  ArtifactRecord,
  ArtifactStoreOptions,
  ArtifactType,
  ImageInspection,
  MusicArtifact,
  MusicInspection,
  SaveProvenance,
} from "@wtagent/types";

// What a media validator reports about a buffer: the container fields shared by
// images and music, plus whichever media-specific fields that format provides.
export type MediaInspection = Pick<ImageInspection, "mimeType" | "extension" | "size" | "sha256">
  & Partial<ImageInspection>
  & Partial<MusicInspection>;

type ImageDimensions = Partial<Pick<ImageInspection, "width" | "height">>;

const SIGNATURES = Object.freeze([
  { mimeType: "image/png", extension: ".png", matches: (b: Buffer) => b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mimeType: "image/jpeg", extension: ".jpg", matches: (b: Buffer) => b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b.at(-2) === 0xff && b.at(-1) === 0xd9 },
  { mimeType: "image/webp", extension: ".webp", matches: (b: Buffer) => b.length >= 16 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
]);

function pngDimensions(buffer: Buffer): ImageDimensions {
  return buffer.length >= 24
    ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    : {};
}

function jpegDimensions(buffer: Buffer): ImageDimensions {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return {};
}

function webpDimensions(buffer: Buffer): ImageDimensions {
  const kind = buffer.toString("ascii", 12, 16);
  if (kind === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (kind === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }
  if (kind === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return {};
}

export function inspectImageBuffer(buffer: Buffer): MediaInspection {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("The provider returned an empty image artifact.");
  }
  const format = SIGNATURES.find((entry) => entry.matches(buffer));
  if (!format) {
    throw new Error("The downloaded artifact is not a supported PNG, JPEG, or WebP image.");
  }
  const dimensions = format.mimeType === "image/png"
    ? pngDimensions(buffer)
    : format.mimeType === "image/jpeg"
      ? jpegDimensions(buffer)
      : webpDimensions(buffer);
  if (typeof dimensions.width !== "number" || typeof dimensions.height !== "number"
      || !Number.isSafeInteger(dimensions.width) || !Number.isSafeInteger(dimensions.height)
      || dimensions.width <= 0 || dimensions.height <= 0) {
    throw new Error(`Could not read dimensions from ${format.mimeType} artifact.`);
  }
  return {
    ...format,
    ...dimensions,
    size: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

export class ArtifactStore {
  projectRoot: string;
  allowOutside: boolean;

  constructor({ projectRoot, allowOutside = false }: ArtifactStoreOptions) {
    this.projectRoot = path.resolve(projectRoot);
    this.allowOutside = allowOutside;
  }

  async resolveOutputPath(rawPath: string) {
    const info = await resolveToolPath(this.projectRoot, rawPath);
    if (!info.inside && !this.allowOutside) {
      throw new Error(`Path is outside project root: ${info.path}`);
    }
    await fs.mkdir(path.dirname(info.path), { recursive: true });
    return await resolveCanonicalWriteTarget(this.projectRoot, info.path, {
      allowOutside: this.allowOutside,
    });
  }

  async saveImage(sourcePath: string, outputPath: string, provenance: SaveProvenance = {}): Promise<ArtifactRecord> {
    return await this.saveValidatedMedia(sourcePath, outputPath, provenance, inspectImageBuffer, "image");
  }

  async saveMusic(sourcePath: string, outputPath: string, provenance: SaveProvenance = {}): Promise<MusicArtifact> {
    return await this.saveValidatedMedia(sourcePath, outputPath, provenance, inspectMusicBuffer, "music") as MusicArtifact;
  }

  async saveValidatedMedia(
    sourcePath: string,
    outputPath: string,
    provenance: SaveProvenance,
    inspect: (buffer: Buffer) => MediaInspection,
    type: ArtifactType,
  ): Promise<ArtifactRecord> {
    const target = await this.resolveOutputPath(outputPath);
    const buffer = await fs.readFile(sourcePath);
    const inspected = inspect(buffer);
    const requestedExtension = path.extname(target).toLowerCase();
    const acceptedExtensions = inspected.mimeType === "image/jpeg"
      ? new Set([".jpg", ".jpeg"])
      : new Set([inspected.extension]);
    if (requestedExtension && !acceptedExtensions.has(requestedExtension)) {
      throw new Error(
        `Output extension ${requestedExtension} does not match downloaded ${inspected.mimeType}.`,
      );
    }
    const temporary = `${target}.wtagent-${process.pid}-${randomUUID()}.tmp`;
    try {
      await fs.copyFile(sourcePath, temporary);
      await replaceFileAtomic(temporary, target);
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => null);
    }
    return {
      id: `artifact_${inspected.sha256.slice(0, 20)}`,
      type,
      localPath: target,
      mimeType: inspected.mimeType,
      width: inspected.width,
      height: inspected.height,
      ...(type === "music" ? { durationSeconds: inspected.durationSeconds, hasVideo: inspected.hasVideo } : {}),
      size: inspected.size,
      sha256: inspected.sha256,
      provenance,
    };
  }
}
