import type {
  AuthState,
  FileAttachment,
  ImageCapabilities,
  ImageGenerateContext,
  ImageGenerateResult,
  ImageRequest,
  RestorationResult,
  SendMessageResult,
} from "@neuralforge/types";

// Provider contract for browser-backed image generation. Concrete drivers own
// website-specific navigation, completion detection, and artifact correlation.

// A download accepted by sendMessage(). The adapters normalise either a plain
// path or a named attachment, so both forms are legal inbound.
export type ImageAttachment = string | FileAttachment;

// A network response for a media request, as playwright reports it.
export interface BrowserResponse {
  ok(): boolean;
  status(): number;
  body(): Promise<Buffer>;
  headers(): Record<string, string>;
  url(): string;
}

export interface BrowserDownload {
  suggestedFilename(): string;
  saveAs(path: string): Promise<void>;
  url(): string;
}

// A locator restricted to `<img>` nodes, so the page-side callback can read
// layout properties instead of only the generic Element members.
export interface ImageElementLocator {
  evaluateAll<R>(pageFunction: (images: readonly HTMLImageElement[]) => R): Promise<R>;
}

// Playwright locator surface used by the image drivers, described structurally
// so this package does not depend on the browser package's internals.
export interface BrowserLocator {
  count(): Promise<number>;
  first(): BrowserLocator;
  last(): BrowserLocator;
  nth(index: number): BrowserLocator;
  isVisible(): Promise<boolean>;
  click(): Promise<void>;
  innerText(): Promise<string>;
  getAttribute(name: string): Promise<string | null>;
  locator(selector: "img"): ImageElementLocator;
  locator(selector: string): BrowserLocator;
  getByRole(role: string, options?: { name?: string | RegExp }): BrowserLocator;
  evaluate<R, Arg>(pageFunction: (element: Element, arg: Arg) => R, arg: Arg): Promise<R>;
}

export interface BrowserPage {
  url(): string;
  waitForTimeout(timeout: number): Promise<void>;
  bringToFront(): Promise<void>;
  locator(selector: string): BrowserLocator;
  request: {
    get(url: string, options?: { timeout?: number }): Promise<BrowserResponse>;
  };
  evaluate<R, Arg>(pageFunction: (arg: Arg) => R, arg: Arg): Promise<R>;
  waitForEvent(event: "download", options?: { timeout?: number }): Promise<BrowserDownload>;
  on(event: "response", listener: (response: BrowserResponse) => void): void;
  off(event: "response", listener: (response: BrowserResponse) => void): void;
}

// The assistant message identity the drivers correlate a new reply with.
export interface AssistantMessageIdentity {
  id?: string | null;
  turn?: number | null;
}

export interface ImageSendMessageOptions {
  files?: ImageAttachment[];
  maxBytes?: number | null;
  outboundId: string;
  allowAssistantContinuation: boolean;
  requireAttachments: boolean;
}

// The adapter members the image drivers drive. Declared structurally: the
// drivers only ever see these, and each provider implements them.
export interface ImageWebAdapter {
  page: BrowserPage;
  // The attached browser context, opaque here: the pool only checks that it
  // still exists before reusing the primary adapter.
  context?: unknown;
  ownsWindow?: boolean;
  composerLocators(): BrowserLocator[];
  stopButtonLocators(): BrowserLocator[];
  assistantMessages(): BrowserLocator;
  messageIdentity(message: BrowserLocator): Promise<AssistantMessageIdentity>;
  assistantText(message: BrowserLocator): Promise<string>;
  isAssistantGenerating(message: BrowserLocator): Promise<boolean>;
  isNewAssistantIdentity(identity: AssistantMessageIdentity & { text?: string }): boolean;
  classifyConversationUrl(url: string): string;
  hasReliableCompletionSignal(): boolean;
  truncatedEnvelopeGraceMs(): number;
  sendMessage(text: string, options: ImageSendMessageOptions): Promise<SendMessageResult>;
  captureAuxiliaryTurnCompletion?(options: { timeoutMs: number }): Promise<RestorationResult | null>;
  getLastSendStatus?(): string;
  restoreWindow?(): Promise<void>;
  minimizeWindow?(): Promise<void>;
}

// An adapter that owns its own browser profile, as handed out by the session
// pool for a provider other than the active one.
export interface PooledImageAdapter extends ImageWebAdapter {
  launch(): Promise<void>;
  close(): Promise<void>;
  getAuthState(): Promise<AuthState>;
  waitForManualLogin(options?: { timeoutMs?: number }): Promise<void>;
  startConversation(url: string | null): Promise<RestorationResult | void>;
  ownsWindow?: boolean;
}

// The provider record the pool needs in order to launch or reuse a profile.
export interface ImageProviderProfile {
  id: string;
  label: string;
}

export interface ImageAdapterCreationOptions {
  provider: ImageProviderProfile;
  profileDir: string;
  chromePath?: string | null;
  debug: boolean;
  minimized: boolean;
  cancelOnEsc: boolean;
}

export type ImageAdapterFactory = (options: ImageAdapterCreationOptions) => PooledImageAdapter;

export interface ImageAdapterResource {
  adapter: PooledImageAdapter;
  sharedConversation: boolean;
  close: () => Promise<void>;
}

// Requests always reach the drivers with a resolved timeout and reference list,
// which the shared optional request shape does not guarantee.
export interface ImageGenerationRequest extends Omit<ImageRequest, "aspectRatio" | "referenceImages"> {
  aspectRatio: string;
  referenceImages: string[];
  timeoutMs: number;
}

// A completed textual provider reply. The runtime result carries the reply in
// `text`, so the shared `message` field alone cannot describe it.
export interface ImageTextResult extends Omit<ImageGenerateResult, "type"> {
  type: "text";
  text: string;
}

// The generated file a driver hands back before the artifact store verifies it.
export interface ImageArtifactResult extends Omit<ImageGenerateResult, "type"> {
  type?: "image";
  sourcePath: string;
}

export type ImageTurnResult = ImageArtifactResult | ImageTextResult;

// Auxiliary-turn support handed to a driver by the Runtime.
export interface ImageTurnExecution {
  runAuxiliaryTurn?: ImageGenerateContext["runAuxiliaryTurn"];
}

// Everything a completion callback needs to finish the turn it just submitted.
export interface ImageTurnCompletionContext {
  adapter: ImageWebAdapter;
  page: BrowserPage;
  sendResult: SendMessageResult;
  timeoutMs: number;
}

export type ImageTurnCompleter = (
  context: ImageTurnCompletionContext,
) => Promise<ImageTurnResult>;

// Cross-poll state for the stable-text detection below.
export interface CompletedTextState {
  candidate: string | null;
  since: number;
}

// A provider failure that already spent its remote operation must not be
// replayed; drivers flag such errors so Runtime can apply no-retry semantics.
export interface CompletionUnknownError extends Error {
  completionUnknown?: boolean;
  meta?: Record<string, unknown>;
}

export interface ImageDriverOptions {
  provider: string;
  adapter: ImageWebAdapter;
  sharedConversation?: boolean;
  // Test hook: how long a candidate must stay unchanged before it is accepted.
  responseStabilityMs?: number;
}

// The driver view the generation service consumes.
export interface ImageGenerationDriver {
  readonly provider: string;
  readonly adapter?: ImageWebAdapter | null;
  capabilities(): ImageCapabilities;
  generate(
    request: ImageGenerationRequest,
    execution: ImageTurnExecution,
  ): Promise<ImageTurnResult>;
}

export class ImageProviderDriver {
  provider: string;
  adapter: ImageWebAdapter;
  sharedConversation: boolean;

  constructor({ provider, adapter, sharedConversation = false }: ImageDriverOptions) {
    this.provider = provider;
    this.adapter = adapter;
    this.sharedConversation = sharedConversation;
  }

  capabilities(): ImageCapabilities {
    return Object.freeze({
      generate: true,
      referenceImages: false,
      aspectRatios: [],
      imageCount: 1,
    });
  }

  async generate(
    _request: ImageGenerationRequest,
    _execution: ImageTurnExecution = {},
  ): Promise<ImageTurnResult> {
    throw new Error(`${this.provider} does not implement image generation.`);
  }
}
