import { describe, it, expect } from 'vitest';
import { createArtifactPreview, ArtifactPreview } from '../src/artifact-preview.js';
import type { ArtifactRecord } from '@dx-platform/types';

const secret = 'test-secret-key-12345';

function makeRecord(overrides: Partial<ArtifactRecord> = {}): ArtifactRecord {
  return {
    id: 'artifact_abc123',
    type: 'image',
    localPath: '/tmp/test.png',
    mimeType: 'image/png',
    width: 800,
    height: 600,
    size: 1024,
    sha256: 'abc123def456',
    provenance: {},
    ...overrides,
  };
}

describe('ArtifactPreview', () => {
  it('should create a signed URL with token and expiry', async () => {
    const preview = createArtifactPreview({ secret });
    const record = makeRecord();
    const url = await preview.createSignedUrl(record);
    expect(url.url).toContain('/v1/artifacts/preview/');
    expect(url.token).toBeTruthy();
    expect(url.expiresAt).toBeTruthy();
    expect(url.artifactId).toBe(record.id);
    expect(url.mimeType).toBe('image/png');
    expect(url.width).toBe(800);
    expect(url.height).toBe(600);
    expect(url.size).toBe(1024);
  });

  it('should reject expired tokens', async () => {
    const preview = createArtifactPreview({ secret, ttlMs: 1 });
    const record = makeRecord();
    const signed = await preview.createSignedUrl(record, 1);
    // Wait for expiry
    await new Promise((r) => setTimeout(r, 50));
    const result = await preview.verifyToken(signed.token, signed.token, Date.now() + 100);
    expect(result).toBeNull();
  });

  it('should reject tampered signatures', async () => {
    const preview = createArtifactPreview({ secret });
    const record = makeRecord();
    const signed = await preview.createSignedUrl(record);
    const result = await preview.verifyToken(signed.token, 'tampered-signature', Date.now() + 10000);
    expect(result).toBeNull();
  });

  it('should generate thumbnails for images with dimensions', async () => {
    const tmpDir = `/tmp/neuralforge-preview-test-${Date.now()}`;
    const preview = createArtifactPreview({ secret, thumbnailsDir: tmpDir });
    const record = makeRecord();
    const thumb = await preview.generateThumbnail(record);
    expect(thumb).not.toBeNull();
    expect(thumb?.artifactId).toBe(record.id);
    expect(thumb?.width).toBeLessThanOrEqual(preview.maxThumbnailSize);
    expect(thumb?.height).toBeGreaterThan(0);
    expect(thumb?.sha256).toBeTruthy();
  });

  it('should return null for thumbnails when no dimensions', async () => {
    const preview = createArtifactPreview({ secret });
    const record = makeRecord({ width: undefined, height: undefined });
    const thumb = await preview.generateThumbnail(record);
    expect(thumb).toBeNull();
  });

  it('should respect maxThumbnailSize', async () => {
    const preview = createArtifactPreview({ secret, maxThumbnailSize: 100 });
    const record = makeRecord({ width: 1920, height: 1080 });
    const thumb = await preview.generateThumbnail(record);
    expect(thumb).not.toBeNull();
    expect(thumb?.width).toBe(100);
    expect(thumb?.height).toBe(56);
  });

  it('should be constructable via constructor', () => {
    const preview = new ArtifactPreview({ secret });
    expect(preview).toBeInstanceOf(ArtifactPreview);
    expect(preview.maxThumbnailSize).toBe(256);
  });
});
