import fs from "node:fs/promises";
import { BrowserImageDriver } from "../browser-image-driver.js";
import type { ImageCapabilities } from "@neuralforge/types";
import type {
  CompletedTextState,
  ImageGenerationRequest,
  ImageTurnExecution,
  ImageTurnResult,
  ImageTextResult,
} from "../image-provider-driver.js";

// One rendered `<img>` of the assistant reply, read inside the page.
export interface GeminiImageCandidate {
  source: string;
  alt: string;
  width: number;
  height: number;
  type?: undefined;
}

export class GeminiImageDriver extends BrowserImageDriver {
  capabilities(): ImageCapabilities {
    return Object.freeze({
      generate: true,
      referenceImages: true,
      aspectRatios: ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"],
      imageCount: 1,
    });
  }

  async generatedImages(): Promise<GeminiImageCandidate[]> {
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
    baseline: ReadonlySet<string> = new Set(),
  ): Promise<GeminiImageCandidate | ImageTextResult> {
    const deadline = Date.now() + timeoutMs;
    let stableSource: string | null = null;
    let stableSince = 0;
    const textState: CompletedTextState = { candidate: null, since: 0 };
    while (Date.now() < deadline) {
      const images = (await this.generatedImages())
        .filter((image) => !baseline.has(image.source));
      if (images.length === 1) {
        if (stableSource !== images[0].source) {
          stableSource = images[0].source;
          stableSince = Date.now();
        } else if (Date.now() - stableSince >= 2_000) {
          return images[0];
        }
      } else if (images.length > 1) {
        throw new Error(
          "Gemini returned multiple images for a single-output request; refusing to choose one implicitly.",
        );
      }
      if (images.length === 0) {
        const text = await this.completedTextResponse(textState);
        if (text) return text;
      } else {
        textState.candidate = null;
      }
      await this.adapter.page.waitForTimeout(1_000);
    }
    throw new Error(`Gemini did not finish an image within ${Math.round(timeoutMs / 1000)} seconds.`);
  }

  async downloadGeneratedImage(
    timeoutMs: number,
    generatedImage: GeminiImageCandidate | null = null,
  ) {
    const response = this.adapter.assistantMessages().last();
    const scope = response;
    const buttonCandidates = [
      scope.getByRole("button", { name: /download(?: image)?|下载(?:图片)?|下載(?:圖片)?/i }),
      scope.locator('button[aria-label*="download" i]'),
      scope.locator('button[data-test-id*="download" i]'),
    ];
    for (const locator of buttonCandidates) {
      if (await locator.first().isVisible().catch(() => false)) {
        try {
          return await this.saveDownload(this.adapter.page, locator.first(), timeoutMs);
        } catch {
          break;
        }
      }
    }
    if (generatedImage?.source) {
      return await this.saveFromUrl(this.adapter.page, generatedImage.source, timeoutMs);
    }
    throw new Error("Gemini generated an image but no image download control was found.");
  }

  async generate(
    request: ImageGenerationRequest,
    execution: ImageTurnExecution = {},
  ): Promise<ImageTurnResult> {
    await this.ensureChatPage();
    const before = new Set<string>((await this.generatedImages()).map((item) => item.source));
    return await this.performTurn(request, execution, async () => {
      const generatedImage = await this.waitForGeneratedImage(request.timeoutMs, before);
      if (generatedImage.type === "text") return generatedImage;
      const downloaded = await this.downloadGeneratedImage(
        Math.min(request.timeoutMs, 60_000),
        generatedImage,
      );
      return {
        sourcePath: downloaded.temporaryPath,
        cleanup: async () => fs.rm(downloaded.temporaryDir, { recursive: true, force: true }),
        provenance: {
          provider: this.provider,
          providerFileId: this.remoteFileId(downloaded.downloadUrl),
          suggestedFilename: downloaded.suggestedFilename,
        },
      };
    });
  }
}
