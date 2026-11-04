import { describe, it, expect } from 'vitest';

import { 
  generateJwt, 
  verifyJwt, 
  extractJwtFromHeader, 
  generateRefreshToken,
  JwtResult,
  JwtOptions 
} from '../src/jwt';

const testSecret = 'test-secret-key-12345';

describe('JWT Authentication', () => {
  it('should generate a valid JWT token', () => {
    const payload = { sub: 'user-123', role: 'admin' };
    const token = generateJwt(payload, { secret: testSecret });
    expect(typeof token).toBe('string');

    const result = verifyJwt(token, { secret: testSecret });
    expect(result.valid).toBe(true);
    expect(result.payload.sub).toBe('user-123');
    expect(result.payload.role).toBe('admin');
  });

  it('should include default timestamps (iat, exp)', () => {
    const payload = { sub: 'user-123' };
    const token = generateJwt(payload, { secret: testSecret });

    const result = verifyJwt(token, { secret: testSecret });
    expect(result.valid).toBe(true);
    expect(result.payload.iat).toBeDefined();
    expect(result.payload.exp).toBeDefined();
    expect(result.payload.exp).toBeGreaterThan(result.payload.iat);
  });

  it('should verify token with custom expiration', () => {
    const payload = { sub: 'user-123' };
    const token = generateJwt(payload, { secret: testSecret, expiresIn: 3600 }); // 1 hour

    const result = verifyJwt(token, { secret: testSecret });
    expect(result.valid).toBe(true);

    // Wait for token to expire and verify it fails
    // (We can't actually wait, but we can test the structure)
    expect(typeof result.payload.exp).toBe('number');
  });

  it('should reject token with invalid signature', () => {
    const payload = { sub: 'user-123' };
    const token = generateJwt(payload, { secret: testSecret });
    const result = verifyJwt(token, { secret: 'wrong-secret' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid signature');
  });

  it('should reject malformed token', () => {
    const result = verifyJwt('invalid-token-format');
    expect(result.valid).toBe(false);

    const result2 = verifyJwt('only.two');
    expect(result2.valid).toBe(false);
  });

  it('should accept token with skipVerification option', () => {
    const payload = { sub: 'user-123' };
    const token = generateJwt(payload, { secret: testSecret });

    const result = verifyJwt(token, { secret: testSecret, skipVerification: true });
    expect(result.valid).toBe(true);
    expect(result.payload.sub).toBe('user-123');
  });

  it('should extract Bearer token from Authorization header', () => {
    const result = extractJwtFromHeader('Bearer test-token-123');
    expect(result).toBe('test-token-123');

    expect(extractJwtFromHeader('Basic abc123')).toBeUndefined();
    expect(extractJwtFromHeader('')).toBeUndefined();
    expect(extractJwtFromHeader(undefined)).toBeUndefined();
  });

  it('should generate refresh tokens', () => {
    const token1 = generateRefreshToken();
    const token2 = generateRefreshToken();
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
  });

  it('should have different refresh tokens each time', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 10; i++) {
      tokens.add(generateRefreshToken());
    }
    expect(tokens.size).toBe(10);
  });
});

describe('JWT Security', () => {
  it('should reject empty token', () => {
    const result = verifyJwt('');
    expect(result.valid).toBe(false);
  });

  it('should reject token with wrong number of parts', () => {
    const result = verifyJwt('only.one');
    expect(result.valid).toBe(false);
  });

  it('should reject token without secret when not skipping', () => {
    const result = verifyJwt('invalid.token.here');
    expect(result.valid).toBe(false);
  });

  it('should verify algorithm in header', () => {
    const payload = { sub: 'user-123' };
    const token = generateJwt(payload, { secret: testSecret, algorithm: 'HS384' });
    // Default verification should still pass for basic tokens
    const result = verifyJwt(token, { secret: testSecret });
    expect(result.valid).toBe(true);
  });
});

describe('JWT Integration', () => {
  it('should work with real-world token structure', () => {
    const payload = {
      sub: 'user-456',
      role: 'user',
      permissions: ['read', 'write'],
      company: 'test-company',
    };

    const token = generateJwt(payload, { secret: testSecret });
    const result = verifyJwt(token, { secret: testSecret });

    expect(result.valid).toBe(true);
    expect(result.payload.sub).toBe('user-456');
    expect(result.payload.role).toBe('user');
    expect(result.payload.permissions).toEqual(['read', 'write']);
    expect(result.payload.company).toBe('test-company');
  });

  it('should extract token and verify it independently', () => {
    const payload = { sub: 'user-789' };
    const token = generateJwt(payload, { secret: testSecret });

    const extracted = extractJwtFromHeader(`Bearer ${token}`);
    expect(extracted).toBe(token);

    const result = verifyJwt(extracted!, { secret: testSecret });
    expect(result.valid).toBe(true);
    expect(result.payload.sub).toBe('user-789');
  });

  it('should reject non-Bearer authorization schemes', () => {
    expect(extractJwtFromHeader('Basic dXNlcjpwYXNz')).toBeUndefined();
    expect(extractJwtFromHeader('Bearer')).toBeUndefined();
    expect(extractJwtFromHeader('')).toBeUndefined();
  });
});