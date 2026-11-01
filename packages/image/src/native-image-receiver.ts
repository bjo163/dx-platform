import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { ArtifactStore, inspectImageBuffer } from "@wtagent/artifacts/artifact-store";
import { createImageDriver, listImageProviderIds } from "./provider-registry.js";
import { parseGrokGeneratedImageUrl } from "./providers/grok-image-driver.js";
import type { ArtifactRecord } from "@wtagent/types";
import type { BrowserImageDriver } from "./browser-image-driver.js";
import type { BrowserLocator, ImageWebAdapter } from "./image-provider-driver.js";

// One rendered `<img>` of the assistant message, read inside the page.
export interface NativeImageCandidate {
  source: string;
  width: number;
  height: number;
}

export interface NativeImageSnapshot {
  pending: boolean;
  images: NativeImageCandidate[];
}

export interface NativeImageContext {
  projectRoot: string;
  handoffId: string;
  assistantMessageId?: string | null;
}

export interface NativeImageReceiverOptions {
  provider: string;
  adapter: ImageWebAdapter;
}

// Receive the ordinary assistant turn. This class never sends a prompt or
// generates an image, and is deliberately absent from the local tool catalog.
export class NativeImageReceiver {
  provider: string;
  adapter: ImageWebAdapter;
  driver: BrowserImageDriver;

  static forAdapter(provider: string, adapter: ImageWebAdapter) {
    return listImageProviderIds().includes(provider)
      ? new NativeImageReceiver({ provider, adapter }) : null;
  }

  constructor({ provider, adapter }: NativeImageReceiverOptions) {
    this.provider = provider;
    this.adapter = adapter;
    this.driver = createImageDriver({ provider, adapter });
  }

  async read(message: BrowserLocator): Promise<NativeImageSnapshot> {
    const snapshot = await message.locator("img").evaluateAll((elements) => ({
      pending: elements.some((image) => !image.complete),
      images: elements.filter((image) => image.isConnected && image.complete
        && image.naturalWidth >= 256 && image.naturalHeight >= 256)
        .map((image) => ({
          source: image.currentSrc || image.src,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })),
    }));
    const seen = new Set<string>();
    snapshot.images = snapshot.images.filter((image) => {
      if (!image.source || seen.has(image.source)) return false;
      if (this.provider === "grok" && !parseGrokGeneratedImageUrl(image.source)) return false;
      seen.add(image.source);
      return true;
    });
    return snapshot;
  }

  async save(
    images: NativeImageCandidate[],
    { projectRoot, handoffId, assistantMessageId }: NativeImageContext,
  ): Promise<ArtifactRecord[]> {
    const store = new ArtifactStore({ projectRoot });
    // The handoff UUID names this turn, so retries reuse the same destination
    // without overwriting artifacts from another turn or a user-selected path.
    const directory = path.join("artifacts", "native-images",
      createHash("sha256").update(handoffId).digest("hex").slice(0, 24));
    const artifacts: ArtifactRecord[] = [];
    for (const [index, image] of images.entries()) {
      const downloaded = await this.driver.saveFromUrl(this.adapter.page, image.source, 60_000);
      try {
        const inspected = inspectImageBuffer(await fs.readFile(downloaded.temporaryPath));
        artifacts.push(await store.saveImage(downloaded.temporaryPath,
          path.join(directory, `image-${index + 1}${inspected.extension}`), {
            provider: this.provider,
            assistantMessageId,
            source: image.source,
          }));
      } finally {
        await fs.rm(downloaded.temporaryDir, { recursive: true, force: true });
      }
    }
    return artifacts;
  }
}
