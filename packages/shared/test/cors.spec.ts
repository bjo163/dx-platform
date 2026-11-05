import { describe, it, expect } from 'vitest';

import {
  CorsValidator,
  createCorsValidator,
  createSafeCorsConfig,
  parseExactOrigin,
  type CorsOptions,
} from '../src/cors';

describe('CorsValidator', () => {
  it('should reject unknown origins by default', () => {
    const validator = createCorsValidator();
    const result = validator.validateOrigin('https://evil.com');
    expect(result.allowed).toBe(false);
  });

  it('should allow configured origins', () => {
    const validator = createCorsValidator({
      origins: ['https://example.com'],
    });
    const result = validator.validateOrigin('https://example.com');
    expect(result.allowed).toBe(true);
    expect(result.origin).toBe('https://example.com');
    expect(result.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
  });

  it('should include all CORS headers for allowed origins', () => {
    const validator = createCorsValidator({
      origins: ['https://example.com'],
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      credentials: true,
    });
    const result = validator.validateOrigin('https://example.com');

    expect(result.headers['Access-Control-Allow-Methods']).toBe('GET, POST');
    expect(result.headers['Access-Control-Allow-Headers']).toBe('Content-Type');
    expect(result.headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(result.headers['Access-Control-Max-Age']).toBeDefined();
  });

  it('should allow all origins when allowAll is true', () => {
    const validator = createCorsValidator({ allowAll: true });
    const result = validator.validateOrigin('https://any-origin.com');
    expect(result.allowed).toBe(true);
    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('should detect preflight requests', () => {
    const validator = createCorsValidator();
    expect(validator.isPreflight('OPTIONS', 'https://example.com')).toBe(true);
    expect(validator.isPreflight('GET', 'https://example.com')).toBe(false);
    expect(validator.isPreflight('OPTIONS', undefined)).toBe(false);
  });

  it('should manage origins dynamically', () => {
    const validator = createCorsValidator({ origins: ['https://example.com'] });
    
    expect(validator.isOriginAllowed('https://example.com')).toBe(true);
    expect(validator.isOriginAllowed('https://other.com')).toBe(false);
    
    validator.addOrigin('https://other.com');
    expect(validator.isOriginAllowed('https://other.com')).toBe(true);
    
    validator.removeOrigin('https://other.com');
    expect(validator.isOriginAllowed('https://other.com')).toBe(false);
  });

  it('should support wildcard origin', () => {
    const validator = createCorsValidator({ origins: ['*'] });
    expect(validator.isOriginAllowed('https://any.com')).toBe(true);
  });

  it('should not include credentials by default', () => {
    const validator = createCorsValidator({
      origins: ['https://example.com'],
    });
    const result = validator.validateOrigin('https://example.com');
    expect(result.headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  it('should create safe default config', () => {
    const config = createSafeCorsConfig();
    expect(config.allowAll).toBe(false);
    expect(config.origins).toContain('http://localhost:3000');
    expect(config.origins).toContain('http://localhost:5173');
    expect(config.credentials).toBe(false);
  });

  it('should get origins list', () => {
    const validator = createCorsValidator({
      origins: ['https://example.com', 'https://other.com'],
    });
    expect(validator.getOrigins()).toEqual(['https://example.com', 'https://other.com']);
  });
});

describe('CorsValidator security defaults', () => {
  it('should reject null origin', () => {
    const validator = createCorsValidator({ origins: ['https://example.com'] });
    const result = validator.validateOrigin('null');
    expect(result.allowed).toBe(false);
  });

  it('should reject empty origin', () => {
    const validator = createCorsValidator({ origins: ['https://example.com'] });
    const result = validator.validateOrigin('');
    expect(result.allowed).toBe(false);
  });

  it('should not allow file:// origins by default', () => {
    const validator = createCorsValidator({ origins: ['http://localhost:3000'] });
    expect(validator.isOriginAllowed('file://')).toBe(false);
  });
});

describe('parseExactOrigin', () => {
  it('normalizes scheme and host casing', () => {
    expect(parseExactOrigin('HTTPS://Example.COM')).toBe('https://example.com');
  });

  it('keeps the port as part of the origin', () => {
    expect(parseExactOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('strips path, query, and fragment', () => {
    expect(parseExactOrigin('https://example.com/admin?x=1#y')).toBe('https://example.com');
  });

  it('rejects opaque and malformed origins', () => {
    expect(parseExactOrigin('null')).toBeNull();
    expect(parseExactOrigin('')).toBeNull();
    expect(parseExactOrigin('file://')).toBeNull();
    expect(parseExactOrigin('not-an-origin')).toBeNull();
  });
});

describe('DX2-0112 wildcard rejected in credential mode', () => {
  it('refuses to construct a validator that pairs wildcard with credentials', () => {
    expect(() => createCorsValidator({ origins: ['*'], credentials: true })).toThrow(TypeError);
  });

  it('refuses allowAll when credentials are enabled', () => {
    const validator = createCorsValidator({ allowAll: true, credentials: true });
    const result = validator.validateOrigin('https://any-origin.example');
    expect(result.allowed).toBe(false);
  });

  it('does not emit wildcard together with credentials', () => {
    const validator = createCorsValidator({ origins: ['https://app.example'], credentials: true });
    const result = validator.validateOrigin('https://app.example');
    expect(result.allowed).toBe(true);
    expect(result.headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(result.headers['Access-Control-Allow-Origin']).toBe('https://app.example');
  });

  it('refuses to add a wildcard to a credentialed validator', () => {
    const validator = createCorsValidator({ origins: ['https://app.example'], credentials: true });
    expect(() => validator.addOrigin('*')).toThrow(TypeError);
  });

  it('rejects an origin with a smuggled path suffix', () => {
    const validator = createCorsValidator({ origins: ['https://app.example'] });
    expect(validator.isOriginAllowed('https://app.example.evil.com')).toBe(false);
    expect(validator.validateOrigin('https://app.example.evil.com').allowed).toBe(false);
  });

  it('matches case-insensitive scheme and host but not port', () => {
    const validator = createCorsValidator({ origins: ['http://localhost:3000'] });
    expect(validator.isOriginAllowed('HTTP://LOCALHOST:3000')).toBe(true);
    expect(validator.isOriginAllowed('http://localhost:3001')).toBe(false);
  });
});
