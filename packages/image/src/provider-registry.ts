import { ChatGPTImageDriver } from "./providers/chatgpt-image-driver.js";
import { GeminiImageDriver } from "./providers/gemini-image-driver.js";
import { GrokImageDriver } from "./providers/grok-image-driver.js";
import type { BrowserImageDriver } from "./browser-image-driver.js";
import type { ImageWebAdapter } from "./image-provider-driver.js";

export const IMAGE_PROVIDERS = Object.freeze({
  chatgpt: Object.freeze({ id: "chatgpt", driver: ChatGPTImageDriver }),
  gemini: Object.freeze({ id: "gemini", driver: GeminiImageDriver }),
  grok: Object.freeze({ id: "grok", driver: GrokImageDriver }),
});

export type ImageProviderId = keyof typeof IMAGE_PROVIDERS;

export interface CreateImageDriverOptions {
  provider: string;
  adapter: ImageWebAdapter;
  sharedConversation?: boolean;
}

export function listImageProviderIds() {
  return Object.keys(IMAGE_PROVIDERS);
}

export function createImageDriver({
  provider,
  adapter,
  sharedConversation = false,
}: CreateImageDriverOptions): BrowserImageDriver {
  const record = IMAGE_PROVIDERS[provider as ImageProviderId];
  if (!record) {
    throw new Error(
      `Provider "${provider}" has no image driver. Supported image providers: ${listImageProviderIds().join(", ")}.`,
    );
  }
  return new record.driver({ provider, adapter, sharedConversation });
}
