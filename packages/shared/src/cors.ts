/**
 * CORS (Cross-Origin Resource Sharing) configuration and validation.
 * Provides secure defaults with configurable options.
 */

export interface CorsOptions {
  /** Allowed origins (defaults to same-origin only). */
  origins?: string[];
  /** Allowed HTTP methods (defaults to common safe methods). */
  methods?: string[];
  /** Allowed headers (defaults to common headers). */
  allowedHeaders?: string[];
  /** Exposed headers for client access. */
  exposedHeaders?: string[];
  /** Whether to allow credentials (cookies, auth headers). */
  credentials?: boolean;
  /** Max age for preflight cache in seconds. */
  maxAge?: number;
  /** Whether to allow all origins (NOT recommended for production). */
  allowAll?: boolean;
}

export interface CorsResult {
  allowed: boolean;
  origin?: string;
  headers: Record<string, string>;
}

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const DEFAULT_HEADERS = ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With'];
const DEFAULT_EXPOSED_HEADERS = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'];

const OPAQUE_ORIGINS = new Set(['null', 'undefined', 'file://', '']);

/**
 * Normalizes an origin to `scheme://host[:port]` with a lowercase scheme and host,
 * so that `HTTPS://Example.COM` and `https://example.com` compare equal while a
 * path, query, or fragment appended to an allowed origin does not smuggle it through.
 * Returns null when the value is not a syntactically valid exact origin.
 */
export function parseExactOrigin(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (OPAQUE_ORIGINS.has(trimmed.toLowerCase())) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!url.protocol.startsWith('http')) return null;
  const serialized = url.origin;
  if (!serialized || serialized === 'null') return null;
  return serialized;
}

export class CorsValidator {
  private readonly allowedOrigins: Set<string>;
  private readonly methods: string[];
  private readonly allowedHeaders: string[];
  private readonly exposedHeaders: string[];
  private readonly credentials: boolean;
  private readonly maxAge: number;
  private readonly allowAll: boolean;

  constructor(options: CorsOptions = {}) {
    this.credentials = options.credentials ?? false;
    // A wildcard cannot carry credentials: browsers reject `Access-Control-Allow-Origin: *`
    // together with `Access-Control-Allow-Credentials: true`, and emitting it anyway would
    // only mislead the operator into thinking credentialed cross-origin access is granted.
    this.allowAll = (options.allowAll ?? false) && !this.credentials;
    const configured = options.origins ?? [];
    if (configured.includes('*')) {
      if (this.credentials) {
        throw new TypeError('Wildcard origin "*" cannot be combined with credentials: true.');
      }
      this.allowAll = true;
      this.allowedOrigins = new Set();
    } else {
      const parsed = configured
        .map((origin) => parseExactOrigin(origin))
        .filter((origin): origin is string => origin !== null);
      if (parsed.length !== configured.length) {
        throw new TypeError('Every configured CORS origin must be an exact http(s) origin without a path.');
      }
      this.allowedOrigins = new Set(parsed);
    }
    this.methods = options.methods ?? DEFAULT_METHODS;
    this.allowedHeaders = options.allowedHeaders ?? DEFAULT_HEADERS;
    this.exposedHeaders = options.exposedHeaders ?? DEFAULT_EXPOSED_HEADERS;
    this.maxAge = options.maxAge ?? 86400;
  }

  public validateOrigin(origin: string | undefined): CorsResult {
    const headers: Record<string, string> = {};

    if (this.allowAll) {
      headers['Access-Control-Allow-Origin'] = '*';
      return { allowed: true, origin: '*', headers };
    }

    const exact = parseExactOrigin(origin);
    if (!exact) {
      return { allowed: false, headers };
    }

    if (this.allowedOrigins.has(exact)) {
      headers['Access-Control-Allow-Origin'] = exact;
      headers['Access-Control-Allow-Methods'] = this.methods.join(', ');
      headers['Access-Control-Allow-Headers'] = this.allowedHeaders.join(', ');
      headers['Access-Control-Expose-Headers'] = this.exposedHeaders.join(', ');
      headers['Access-Control-Max-Age'] = String(this.maxAge);
      
      if (this.credentials) {
        headers['Access-Control-Allow-Credentials'] = 'true';
      }
      
      return { allowed: true, origin: exact, headers };
    }

    return { allowed: false, origin: exact, headers };
  }

  public isPreflight(method: string, origin?: string): boolean {
    return method === 'OPTIONS' && !!origin;
  }

  public getPreflightHeaders(origin: string): Record<string, string> {
    const result = this.validateOrigin(origin);
    return result.headers;
  }

  public addOrigin(origin: string): void {
    const exact = parseExactOrigin(origin);
    if (!exact) {
      throw new TypeError(`"${origin}" is not an exact http(s) origin.`);
    }
    if (this.credentials && exact === '*') {
      throw new TypeError('Wildcard origin "*" cannot be combined with credentials: true.');
    }
    this.allowedOrigins.add(exact);
  }

  public removeOrigin(origin: string): void {
    const exact = parseExactOrigin(origin);
    if (exact) this.allowedOrigins.delete(exact);
  }

  public getOrigins(): string[] {
    return Array.from(this.allowedOrigins);
  }

  public isOriginAllowed(origin: string): boolean {
    if (this.allowAll) return true;
    const exact = parseExactOrigin(origin);
    return exact !== null && this.allowedOrigins.has(exact);
  }
}

export function createCorsValidator(options: CorsOptions = {}): CorsValidator {
  return new CorsValidator(options);
}

export function createSafeCorsConfig(): CorsOptions {
  return {
    origins: ['http://localhost:3000', 'http://localhost:5173'],
    methods: DEFAULT_METHODS,
    allowedHeaders: DEFAULT_HEADERS,
    exposedHeaders: DEFAULT_EXPOSED_HEADERS,
    credentials: false,
    maxAge: 86400,
    allowAll: false,
  };
}
