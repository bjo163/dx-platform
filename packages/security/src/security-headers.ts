// Security headers middleware for WTAgent

import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';

export interface SecurityHeadersOptions {
  /** Content Security Policy directive */
  csp?: string;
  /** HSTS (HTTP Strict Transport Security) */
  hsts?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  /** X-Frame-Options */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM' | string;
  /** X-Content-Type-Options */
  contentTypeOptions?: boolean;
  /** Referrer-Policy */
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | string;
  /** Permissions-Policy */
  permissionsPolicy?: string;
}

export function createSecurityHeadersMiddleware(opts: SecurityHeadersOptions = {}): any {
  const {
    csp = "default-src 'self'";,
    hsts = { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameOptions = 'DENY',
    contentTypeOptions = true,
    referrerPolicy = 'strict-origin-when-cross-origin',
    permissionsPolicy = '',
  } = opts;

  return async (request: any, reply: FastifyReply) => {
    // Content Security Policy
    reply.header('Content-Security-Policy', csp);

    // HSTS
    if (hsts) {
      const hstsValue = `max-age=${hsts.maxAge}${
        hsts.includeSubDomains ? '; includeSubDomains' : ''
      }${
        hsts.preload ? '; preload' : ''
      }`;
      reply.header('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options
    reply.header('X-Frame-Options', frameOptions);

    // X-Content-Type-Options
    if (contentTypeOptions) {
      reply.header('X-Content-Type-Options', 'nosniff');
    }

    // Referrer-Policy
    reply.header('Referrer-Policy', referrerPolicy);

    // Permissions-Policy
    if (permissionsPolicy) {
      reply.header('Permissions-Policy', permissionsPolicy);
    }

    // Permissions-Policy headers (feature policies)
    const permissions: string[] = [];
    if (frameOptions) {
      permissions.push(`camera=${frameOptions === 'DENY' ? 'none' : 'self'}`);
    }
    if (permissionsPolicy) {
      reply.header('Permissions-Policy', permissionsPolicy);
    }
    if (permissions.length > 0) {
      reply.header('Permissions-Policy', permissions.join(', '));
    }
  };
}

export function enableSecurityHeaders(app: FastifyInstance, opts?: SecurityHeadersOptions): void {
  const middleware = createSecurityHeadersMiddleware(opts ?? {});
  app.addHook('onResponse', middleware);
}

export type { SecurityHeadersOptions };