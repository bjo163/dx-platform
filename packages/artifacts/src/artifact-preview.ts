import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { ArtifactRecord } from "@wtagent/types";

export interface PreviewOptions {
  secret: string;
  ttlMs?: number;
  maxThumbnailSize?: number;
  thumbnailsDir?: string;
}

export interface SignedUrl {
  url: string;
  token: string;
  expiresAt: string;
  artifactId: string;
  localPath: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  size: number;
}

export interface ThumbnailResult {
  id: string;
  artifactId: string;
  localPath: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  sha256: string;
}

function base64Url(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(secret: string, message: string): string {
  return createHash("sha256").update(`${secret}:${message}`).digest("base64url");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return timingSafeEqual(bufA, bufB);
}

export class ArtifactPreview {
  readonly #secret: string;
  readonly #ttlMs: number;
  readonly #maxThumbnailSize: number;
  readonly #thumbnailsDir: string;

  constructor(options: PreviewOptions) {
    this.#secret = options.secret;
    this.#ttlMs = options.ttlMs ?? 3600 * 1000;
    this.#maxThumbnailSize = options.maxThumbnailSize ?? 256;
    this.#thumbnailsDir = options.thumbnailsDir ?? path.join(process.cwd(), ".wtagent", "thumbnails");
  }

  async createSignedUrl(record: ArtifactRecord, ttlMs?: number): Promise<SignedUrl> {
    const expiresAt = Date.now() + (ttlMs ?? this.#ttlMs);
    const token = randomUUID();
    const payload = base64Url(JSON.stringify({
      artifactId: record.id,
      localPath: record.localPath,
      expiresAt,
      token,
    }));
    const signature = sign(this.#secret, payload);
    const url = `/v1/artifacts/preview/${base64Url(JSON.stringify({ token, sig: signature, exp: expiresAt }))}`;
    return {
      url,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      artifactId: record.id,
      localPath: record.localPath,
      mimeType: record.mimeType,
      width: record.width,
      height: record.height,
      size: record.size,
    };
  }

  async verifyToken(token: string, signature: string, expiresAt: number): Promise<ArtifactRecord | null> {
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
    const expected = sign(this.#secret, token);
    if (!constantTimeEqual(expected, signature)) return null;
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
      return decoded as ArtifactRecord;
    } catch {
      return null;
    }
  }

  async generateThumbnail(record: ArtifactRecord): Promise<ThumbnailResult | null> {
    if (!record.width || !record.height) return null;
    const thumbWidth = Math.min(record.width, this.#maxThumbnailSize);
    const thumbHeight = Math.round((record.height * thumbWidth) / record.width);
    const thumbId = `thumb_${record.id}_${thumbWidth}x${thumbHeight}`;
    const thumbDir = path.resolve(this.#thumbnailsDir);
    await fs.mkdir(thumbDir, { recursive: true });
    const thumbPath = path.join(thumbDir, `${thumbId}.json`);
    const thumbnail: ThumbnailResult = {
      id: thumbId,
      artifactId: record.id,
      localPath: thumbPath,
      mimeType: record.mimeType,
      width: thumbWidth,
      height: thumbHeight,
      size: 0,
      sha256: createHash("sha256").update(JSON.stringify({ thumbId, record })).digest("hex"),
    };
    await fs.writeFile(thumbPath, JSON.stringify(thumbnail, null, 2), "utf8");
    return thumbnail;
  }

  get maxThumbnailSize(): number {
    return this.#maxThumbnailSize;
  }
}

export function createArtifactPreview(options: PreviewOptions): ArtifactPreview {
  return new ArtifactPreview(options);
}