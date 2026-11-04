import { describe, it, expect } from 'vitest';

import { RateLimiter, createRateLimiter, createTieredRateLimiter, type RateLimitRequest } from '../src/rate-limit';

describe('RateLimiter', () => {
  it('should allow requests under the limit', () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });
    const request: RateLimitRequest = { ip: '127.0.0.1', url: '/test', method: 'GET', headers: {} };

    for (let i = 0; i < 5; i++) {
      const result = limiter.check(request);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
      expect(result.limit).toBe(5);
    }
  });

  it('should block requests over the limit', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 });
    const request: RateLimitRequest = { ip: '127.0.0.1', url: '/test', method: 'GET', headers: {} };

    for (let i = 0; i < 3; i++) {
      limiter.check(request);
    }

    const result = limiter.check(request);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track per-key limits', () => {
    const limiter = createRateLimiter({
      maxRequests: 2,
      windowMs: 1000,
      getKey: (req) => req.ip,
    });

    const req1: RateLimitRequest = { ip: '127.0.0.1', url: '/test', method: 'GET', headers: {} };
    const req2: RateLimitRequest = { ip: '192.168.1.1', url: '/test', method: 'GET', headers: {} };

    limiter.check(req1);
    limiter.check(req1);
    expect(limiter.check(req1).allowed).toBe(false);

    expect(limiter.check(req2).allowed).toBe(true);
    expect(limiter.check(req2).allowed).toBe(true);
    expect(limiter.check(req2).allowed).toBe(false);
  });

  it('should reset all buckets', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });
    const request: RateLimitRequest = { ip: '127.0.0.1', url: '/test', method: 'GET', headers: {} };

    limiter.check(request);
    expect(limiter.check(request).allowed).toBe(false);

    limiter.reset();
    expect(limiter.check(request).allowed).toBe(true);
  });

  it('should track active keys', () => {
    const limiter = createRateLimiter({
      maxRequests: 10,
      windowMs: 1000,
      getKey: (req) => req.ip,
    });

    expect(limiter.getActiveKeys()).toBe(0);

    limiter.check({ ip: '127.0.0.1', url: '/test', method: 'GET', headers: {} });
    expect(limiter.getActiveKeys()).toBe(1);

    limiter.check({ ip: '192.168.1.1', url: '/test', method: 'GET', headers: {} });
    expect(limiter.getActiveKeys()).toBe(2);
  });

  it('should cleanup old entries from buckets', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 100 });
    const request: RateLimitRequest = { ip: '127.0.0.1', url: '/test', method: 'GET', headers: {} };

    limiter.check(request);
    limiter.check(request);
    expect(limiter.check(request).allowed).toBe(false);

    const futureNow = Date.now() + 200;
    const result = limiter.check(request, futureNow);
    expect(result.allowed).toBe(true);
  });

  it('should return correct resetAt timestamp', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 5000 });
    const request: RateLimitRequest = { ip: '127.0.0.1', url: '/test', method: 'GET', headers: {} };
    const now = Date.now();

    const result = limiter.check(request, now);
    expect(result.resetAt).toBe(now + 5000);
  });

  it('should use default key when getKey is not provided', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });
    const req1: RateLimitRequest = { ip: '127.0.0.1', url: '/a', method: 'GET', headers: {} };
    const req2: RateLimitRequest = { ip: '192.168.1.1', url: '/b', method: 'GET', headers: {} };

    limiter.check(req1);
    expect(limiter.check(req2).allowed).toBe(false);
  });
});

describe('createTieredRateLimiter', () => {
  it('should support multiple tiers', () => {
    const limiter = createTieredRateLimiter({
      default: { maxRequests: 2, windowMs: 1000 },
      premium: { maxRequests: 10, windowMs: 1000 },
    });

    const defaultReq: RateLimitRequest & { _rateLimitTier?: string } = { ip: '127.0.0.1', url: '/test', method: 'GET', headers: {} };
    const premiumReq: RateLimitRequest & { _rateLimitTier?: string } = { ...defaultReq, _rateLimitTier: 'premium' };

    for (let i = 0; i < 2; i++) {
      expect(limiter.check(defaultReq).allowed).toBe(true);
    }
    expect(limiter.check(defaultReq).allowed).toBe(false);

    for (let i = 0; i < 10; i++) {
      expect(limiter.check(premiumReq).allowed).toBe(true);
    }
    expect(limiter.check(premiumReq).allowed).toBe(false);
  });

  it('should fall back to default tier', () => {
    const limiter = createTieredRateLimiter({
      default: { maxRequests: 1, windowMs: 1000 },
    });

    const req: RateLimitRequest = { ip: '127.0.0.1', url: '/test', method: 'GET', headers: {} };
    expect(limiter.check(req).allowed).toBe(true);
    expect(limiter.check(req).allowed).toBe(false);
  });
});