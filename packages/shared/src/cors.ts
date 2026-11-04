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

export class CorsValidator {
  private readonly allowedOrigins: Set<string>;
  private readonly methods: string[];
  private readonly allowedHeaders: string[];
  private readonly exposedHeaders: string[];
  private readonly credentials: boolean;
  private readonly maxAge: number;
  private readonly allowAll: boolean;

  constructor(options: CorsOptions = {}) {
    this.allowAll = options.allowAll ?? false;
    this.allowedOrigins = new Set(options.origins ?? []);
    this.methods = options.methods ?? DEFAULT_METHODS;
    this.allowedHeaders = options.allowedHeaders ?? DEFAULT_HEADERS;
    this.exposedHeaders = options.exposedHeaders ?? DEFAULT_EXPOSED_HEADERS;
    this.credentials = options.credentials ?? false;
    this.maxAge = options.maxAge ?? 86400;
  }

  public validateOrigin(origin: string | undefined): CorsResult {
    const headers: Record<string, string> = {};

    if (this.allowAll) {
      headers['Access-Control-Allow-Origin'] = '*';
      return { allowed: true, origin: '*', headers };
    }

    if (!origin) {
      return { allowed: false, headers };
    }

    const isAllowed = this.allowedOrigins.has(origin) || this.allowedOrigins.has('*');
    
    if (isAllowed) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = this.methods.join(', ');
      headers['Access-Control-Allow-Headers'] = this.allowedHeaders.join(', ');
      headers['Access-Control-Expose-Headers'] = this.exposedHeaders.join(', ');
      headers['Access-Control-Max-Age'] = String(this.maxAge);
      
      if (this.credentials) {
        headers['Access-Control-Allow-Credentials'] = 'true';
      }
      
      return { allowed: true, origin, headers };
    }

    return { allowed: false, origin, headers };
  }

  public isPreflight(method: string, origin?: string): boolean {
    return method === 'OPTIONS' && !!origin;
  }

  public getPreflightHeaders(origin: string): Record<string, string> {
    const result = this.validateOrigin(origin);
    return result.headers;
  }

  public addOrigin(origin: string): void {
    this.allowedOrigins.add(origin);
  }

  public removeOrigin(origin: string): void {
    this.allowedOrigins.delete(origin);
  }

  public getOrigins(): string[] {
    return Array.from(this.allowedOrigins);
  }

  public isOriginAllowed(origin: string): boolean {
    return this.allowAll || this.allowedOrigins.has(origin) || this.allowedOrigins.has('*');
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
