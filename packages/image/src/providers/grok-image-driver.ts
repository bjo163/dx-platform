import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BrowserImageDriver } from "../browser-image-driver.js";
import type { ImageCapabilities } from "@wtagent/types";
import type {
  CompletedTextState,
  ImageDriverOptions,
  ImageGenerationRequest,
  ImageTurnExecution,
  ImageTurnResult,
  ImageTextResult,
} from "../image-provider-driver.js";

const GROK_ASSET_HOST = "assets.grok.com";
const GROK_GENERATED_IMAGE_PATH = /^\/users\/[^/]+\/generated\/([0-9a-f-]{16,})\/image\.(?:jpe?g|png|webp)$/i;
const IMAGE_CONTENT_TYPE = /^image\/(?:jpeg|jpg|png|webp)(?:;|$)/i;

// A generated asset as Grok's own URL layout reports it.
export interface GrokGeneratedImage {
  id: string;
  key: string;
  url: string;
}

// One rendered `<img>` of the assistant reply, read inside the page.
export interface GrokImageCandidate {
  source: string;
  alt: string;
  width: number;
  height: number;
}

// The image the driver selected for this turn.
export interface GrokGeneratedSelection {
  source: string;
  providerFileId: string;
  generatedImageCount: number;
  selectedImageIndex: number;
  type?: undefined;
}

// A response as the two supported listeners report it: playwright's APIResponse
// exposes methods, a raw CDP event object exposes plain properties.
export interface ObservedResponse {
  url?: string | (() => string);
  headers?: Record<string, string> | (() => Record<string, string>);
  ok?: boolean | (() => boolean);
}

export interface GrokResponseTracker {
  arm(): void;
  images(): GrokGeneratedImage[];
  lastAddedAt(): number;
  stop(): void;
}

export function parseGrokGeneratedImageUrl(value: string): GrokGeneratedImage | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== GROK_ASSET_HOST) return null;
    const match = url.pathname.match(GROK_GENERATED_IMAGE_PATH);
    if (!match) return null;
    return {
      id: match[1],
      key: `${url.origin}${url.pathname}`,
      url: url.href,
    };
  } catch {
    return null;
  }
}

function responseUrl(response: ObservedResponse): string {
  const value = response.url;
  return typeof value === "function" ? value() : value ?? "";
}

function responseHeaders(response: ObservedResponse): Record<string, string> {
  const value = response.headers;
  return typeof value === "function" ? value() : value ?? {};
}

export class GrokImageDriver extends BrowserImageDriver {
  responseStabilityMs: number;

  constructor(options: ImageDriverOptions) {
    super(options);
    this.responseStabilityMs = options.responseStabilityMs ?? 2_000;
  }

  capabilities(): ImageCapabilities {
    return Object.freeze({
      generate: true,
      referenceImages: false,
      aspectRatios: ["auto", "1:1", "3:2", "2:3", "16:9", "9:16"],
      imageCount: 1,
    });
  }

  trackGeneratedImageResponses(): GrokResponseTracker {
    const page = this.adapter.page;
    const images: GrokGeneratedImage[] = [];
    const keys = new Set<string>();
    let armed = false;
    let lastAddedAt = 0;
    const listener = (response: ObservedResponse) => {
      if (!armed) return;
      const parsed = parseGrokGeneratedImageUrl(responseUrl(response));
      if (!parsed || keys.has(parsed.key)) return;
      const okValue = response.ok;
      const ok = typeof okValue === "function" ? okValue() : okValue;
      const contentType = String(responseHeaders(response)["content-type"] ?? "");
      if (!ok || !IMAGE_CONTENT_TYPE.test(contentType)) return;
      keys.add(parsed.key);
      images.push(parsed);
      lastAddedAt = Date.now();
    };
    page.on("response", listener);
    return {
      arm: () => { armed = true; },
      images: () => images.slice(),
      lastAddedAt: () => lastAddedAt,
      stop: () => page.off("response", listener),
    };
  }

  async currentAssistantImages(): Promise<GrokImageCandidate[]> {
    const response = this.adapter.assistantMessages().last();
    if (await response.count().catch(() => 0) === 0) return [];
    return await response.locator("img").evaluateAll((images) => images.map((image) => ({
      source: image.currentSrc || image.src || "",
      alt: image.alt || "",
      width: image.naturalWidth || 0,
      height: image.naturalHeight || 0,
    })).filter((image) => image.source && image.width >= 256 && image.height >= 256));
  }

  async waitForGeneratedImage(
    timeoutMs: number,
    tracker: GrokResponseTracker,
    baseline: ReadonlySet<string | undefined> = new Set(),
  ): Promise<GrokGeneratedSelection | ImageTextResult> {
    const deadline = Date.now() + timeoutMs;
    let candidateKey: string | null = null;
    let candidateSince = 0;
    const textState: CompletedTextState = { candidate: null, since: 0 };
    while (Date.now() < deadline) {
      const responses = tracker.images();
      const responseByKey = new Map(
        responses.map((image): [string, GrokGeneratedImage] => [image.key, image]),
      );
      const rendered = (await this.currentAssistantImages().catch(() => []))
        .map((image) => ({ ...image, parsed: parseGrokGeneratedImageUrl(image.source) }))
        .filter((image): image is GrokImageCandidate & { parsed: GrokGeneratedImage } => (
          image.parsed !== null
          && !baseline.has(image.parsed.key)
          && responseByKey.has(image.parsed.key)
        ));
      const keys = [...new Set(rendered.map((image) => image.parsed.key))];
      if (
        keys.length > 0
        && Date.now() - tracker.lastAddedAt() >= this.responseStabilityMs
      ) {
        const signature = keys.join("|");
        if (candidateKey !== signature) {
          candidateKey = signature;
          candidateSince = Date.now();
        } else if (Date.now() - candidateSince >= this.responseStabilityMs) {
          // Every key above came from `responseByKey`, so this lookup hits.
          const parsed = responseByKey.get(keys[0])!;
          return {
            source: parsed.url,
            providerFileId: parsed.id,
            generatedImageCount: keys.length,
            selectedImageIndex: 1,
          };
        }
      }
      if (keys.length === 0) {
        const text = await this.completedTextResponse(textState);
        if (text) return text;
      } else {
        textState.candidate = null;
      }
      await this.adapter.page.waitForTimeout(500);
    }
    throw new Error(`Grok did not finish an image within ${Math.round(timeoutMs / 1000)} seconds.`);
  }

  async downloadGeneratedImage(image: GrokGeneratedSelection) {
    const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), "wtagent-image-"));
    const sourceUrl = new URL(image.source);
    const extension = path.extname(sourceUrl.pathname).toLowerCase() || ".jpg";
    const temporaryPath = path.join(temporaryDir, `generated-image${extension}`);
    try {
      const response = await this.adapter.page.request.get(image.source, {
        timeout: 60_000,
      });
      if (!response.ok()) {
        throw new Error(`Grok image download failed with HTTP ${response.status()}.`);
      }
      await fs.writeFile(temporaryPath, await response.body());
      return {
        temporaryDir,
        temporaryPath,
        suggestedFilename: path.basename(sourceUrl.pathname) || `generated-image${extension}`,
        downloadUrl: image.source,
      };
    } catch (error) {
      await fs.rm(temporaryDir, { recursive: true, force: true }).catch(() => null);
      throw error;
    }
  }

  async generate(
    request: ImageGenerationRequest,
    execution: ImageTurnExecution = {},
  ): Promise<ImageTurnResult> {
    if (request.referenceImages.length > 0) {
      throw new Error("The current Grok image driver does not support reference images.");
    }
    await this.ensureChatPage();
    const baseline = new Set<string | undefined>(
      (await this.currentAssistantImages().catch(() => []))
        .map((image) => parseGrokGeneratedImageUrl(image.source)?.key)
        .filter(Boolean),
    );
    const tracker = this.trackGeneratedImageResponses();
    try {
      tracker.arm();
      return await this.performTurn(request, execution, async () => {
        const image = await this.waitForGeneratedImage(
          request.timeoutMs,
          tracker,
          baseline,
        );
        if (image.type === "text") return image;
        const downloaded = await this.downloadGeneratedImage(image);
        return {
          sourcePath: downloaded.temporaryPath,
          cleanup: async () => fs.rm(downloaded.temporaryDir, { recursive: true, force: true }),
          provenance: {
            provider: this.provider,
            providerFileId: image.providerFileId,
            suggestedFilename: downloaded.suggestedFilename,
            generatedImageCount: image.generatedImageCount,
            selectedImageIndex: image.selectedImageIndex,
          },
        };
      });
    } finally {
      tracker.stop();
    }
  }
}
