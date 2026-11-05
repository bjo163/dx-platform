/**
 * In-memory rate limiter with sliding window algorithm.
 * Supports per-key and global rate limits.
 */

export interface RateLimitOptions {
  /** Max requests allowed in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Optional key extractor for per-key limiting. */
  getKey?: (request: RateLimitRequest) => string;
}

export interface RateLimitRequest {
  ip: string;
  url: string;
  method: string;
  headers: Record<string, string>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

class RateLimitBucket {
  private timestamps = new Float64Array(1000);
  private count = 0;

  public record(now: number): void {
    if (this.count === this.timestamps.length) {
      this.timestamps.set(this.timestamps.slice(100));
      this.count -= 100;
    }
    this.timestamps[this.count++] = now;
  }

  public countInWindow(windowStart: number): number {
    let i = 0;
    while (i < this.count && this.timestamps[i] < windowStart) {
      i++;
    }
    return this.count - i;
  }

  public cleanup(windowStart: number): void {
    let i = 0;
    while (i < this.count && this.timestamps[i] < windowStart) {
      i++;
    }
    if (i > 0) {
      this.timestamps.set(this.timestamps.slice(i));
      this.count -= i;
    }
  }
}

export class RateLimiter {
  private buckets = new Map<string, RateLimitBucket>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly getKey: (request: RateLimitRequest) => string;

  constructor(options: RateLimitOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.getKey = options.getKey ?? (() => "global");
  }

  public check(request: RateLimitRequest, now = Date.now()): RateLimitResult {
    const key = this.getKey(request);
    const windowStart = now - this.windowMs;
    const resetAt = now + this.windowMs;

    const bucket = this.buckets.get(key) ?? new RateLimitBucket();
    this.buckets.set(key, bucket);

    bucket.cleanup(windowStart);
    const currentCount = bucket.countInWindow(windowStart);

    if (currentCount >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: this.maxRequests,
      };
    }

    bucket.record(now);
    return {
      allowed: true,
      remaining: this.maxRequests - currentCount - 1,
      resetAt,
      limit: this.maxRequests,
    };
  }

  public reset(): void {
    this.buckets.clear();
  }

  public getActiveKeys(): number {
    return this.buckets.size;
  }
}

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  return new RateLimiter(options);
}

export class TieredRateLimiter extends RateLimiter {
  private tierMap = new Map<string, RateLimiter>();
  private readonly defaultTier: RateLimiter;

  constructor(tiers: Record<string, RateLimitOptions>) {
    // Call parent constructor with dummy values - we'll override the methods
    super({ maxRequests: 1000, windowMs: 60000, getKey: () => "tiered" });

    for (const [name, opts] of Object.entries(tiers)) {
      this.tierMap.set(name, new RateLimiter(opts));
    }
    this.defaultTier = this.tierMap.get("default") ?? new RateLimiter({ maxRequests: 1000, windowMs: 60000 });
  }

  public check(request: RateLimitRequest, now = Date.now()): RateLimitResult {
    const tier = (request as any)._rateLimitTier ?? "default";
    const limiter = this.tierMap.get(tier) ?? this.defaultTier;
    return limiter.check(request, now);
  }

  public reset(): void {
    for (const limiter of this.tierMap.values()) limiter.reset();
    this.defaultTier.reset();
  }

  public getActiveKeys(): number {
    let total = 0;
    for (const limiter of this.tierMap.values()) total += limiter.getActiveKeys();
    total += this.defaultTier.getActiveKeys();
    return total;
  }
}

export function createTieredRateLimiter(tiers: Record<string, RateLimitOptions>): RateLimiter {
  return new TieredRateLimiter(tiers);
}
