/**
 * JWT (JSON Web Token) authentication utilities for NeuralForge API.
 * Supports optional JWT auth with Bearer token validation.
 */

import { randomBytes } from "node:crypto";

export interface JwtPayload {
  /** Unique token identifier. */
  jti?: string;
  /** Subject (user identity). */
  sub?: string;
  /** Issuer identifier. */
  iss?: string;
  /** Audience identifier. */
  aud?: string;
  /** Token expiration timestamp (seconds since epoch). */
  exp?: number;
  /** Token issued-at timestamp (seconds since epoch). */
  iat?: number;
  /** Custom claims. */
  [key: string]: unknown;
}

export interface JwtHeader {
  /** JWT algorithm. */
  alg: string;
  /** JWT type. */
  typ?: string;
}

export interface JwtOptions {
  /** Secret or private key for signing. */
  secret?: string;
  /** Token expiration time in seconds (defaults to 24h). */
  expiresIn?: number | string;
  /** Optional algorithm (defaults to HS256). */
  algorithm?: string;
  /** Whether to skip verification (for testing only). */
  skipVerification?: boolean;
}

export interface JwtResult {
  /** Parsed JWT payload. */
  payload: JwtPayload;
  /** JWT header. */
  header: JwtHeader;
  /** Whether token is valid. */
  valid: boolean;
  /** Error message if invalid. */
  error?: string;
}

export interface RefreshResult {
  /** New JWT token. */
  newToken: string;
  /** Expiration timestamp. */
  expiresAt: number;
}

/**
 * Generates a signed JWT token.
 */
export function generateJwt(
  payload: JwtPayload | Record<string, unknown>,
  options: JwtOptions = {}
): string {
  const secret = options.secret;
  const expiresIn = options.expiresIn ?? 86400; // 24 hours
  const algorithm = options.algorithm ?? "HS256";

  const now = Math.floor(Date.now() / 1000);
  const payloadWithTimestamp = {
    ...payload,
    iat: now,
    exp: typeof expiresIn === "number" ? now + expiresIn : now + 86400,
  };

  // In production, we would use a proper JWT library
  // For this implementation, we create a base64url-encoded token
  const header: JwtHeader = { alg: algorithm, typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payloadWithTimestamp));

  // Simple signature using shared secret
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64url(
    require("node:crypto").createHmac("sha256", secret).update(signingInput).digest()
  );

  return `${signingInput}.${signature}`;
}

/**
 * Verifies and decodes a JWT token.
 */
export function verifyJwt(
  token: string,
  options: JwtOptions = {}
): JwtResult {
  const secret = options.secret;
  const skipVerification = options.skipVerification ?? false;
  const algorithm = options.algorithm ?? "HS256";

  if (!token || typeof token !== "string") {
    return { payload: {}, header: { alg: algorithm }, valid: false, error: "Invalid token format" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { payload: {}, header: { alg: algorithm }, valid: false, error: "Invalid token structure" };
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: JwtHeader;
  let payload: JwtPayload;

  try {
    header = JSON.parse(base64urlDecode(encodedHeader));
  } catch {
    return { payload: {}, header: { alg: algorithm }, valid: false, error: "Invalid header" };
  }

  try {
    payload = JSON.parse(base64urlDecode(encodedPayload));
  } catch {
    return { payload: {}, header: header, valid: false, error: "Invalid payload" };
  }

  if (skipVerification) {
    return { payload, header, valid: true };
  }

  if (!secret) {
    return { payload, header, valid: false, error: "No verification secret provided" };
  }

  // Verify signature
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = base64url(
    require("node:crypto").createHmac("sha256", secret).update(signingInput).digest()
  );

  if (encodedSignature !== expectedSignature) {
    return { payload, header, valid: false, error: "Invalid signature" };
  }

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return { payload, header, valid: false, error: "Token expired" };
  }

  return { payload, header, valid: true };
}

/**
 * Extracts JWT from Authorization header.
 */
export function extractJwtFromHeader(authorization?: string): string | undefined {
  if (!authorization) return undefined;

  const parts = authorization.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }

  return undefined;
}

/**
 * Generates a refresh token.
 */
export function generateRefreshToken(): string {
  return base64url(randomBytes(32).toString("hex"));
}

/**
 * Base64url encoding utility.
 */
function base64urlEncode(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "+");
}

/**
 * Base64url decoding utility.
 */
function base64urlDecode(input: string): string {
  // Add padding if needed
  let padded = input;
  while (padded.length % 4) padded += "=";
  return Buffer.from(padded, "base64").toString("utf-8");
}

// Alias for backward compatibility
const base64url = base64urlEncode;