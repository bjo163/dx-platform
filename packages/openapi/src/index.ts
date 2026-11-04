// OpenAPI document generation for WTAgent

import type { FastifyInstance } from 'fastify';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, OpenAPIPath>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
  };
  security?: Array<{ [key: string]: string[] }>;
}

export interface OpenAPIPath {
  [method: string]: OpenAPIOperation;
}

export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  responses: {
    [code: string]: OpenAPIResponse;
  };
  security?: Array<{ [key: string]: string[] }>;
  requestBody?: {
    content: Record<string, { schema: any }>;
  };
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  schema: {
    type: string;
    format?: string;
    description?: string;
    // eslint-disable-next-line @typescript-eslint/ban-types
    [key: string]: unknown;
  };
  description?: string;
}

export interface OpenAPIResponse {
  description: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  content?: Record<string, { schema: any; example?: any }>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  headers?: Record<string, { schema: any; description?: string }>;
}

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
}

export interface OpenAPIServer {
  url: string;
  description?: string;
}

/**
 * Generate OpenAPI spec from Fastify routes
 * @param app Fastify instance
 * @param options Configuration options
 */
export function generateOpenAPISpec(
  app: FastifyInstance,
  options: {
    title: string;
    version: string;
    description?: string;
    servers?: Array<{ url: string; description?: string }>;
    authHeader?: string;
    securitySchemes?: Record<string, any>;
    tags?: Record<string, { name: string; description: string }>;
  } = {
    title: 'WTAgent API',
    version: '1.0.0',
    description: 'WTAgent API Service',
    authHeader: 'Authorization',
  }
): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: options.title,
      version: options.version,
      description: options.description,
    },
    servers: options.servers ?? [{ url: '/v1' }],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: options.securitySchemes ?? {},
    },
    security: [{ [options.authHeader ?? 'Bearer']: [] }],
  };

  // Collect all routes from the fastify app
  const routes = app._router;

  // Iterate over all routes and build OpenAPI paths
  // ... (simplified - in practice would walk the router tree)

  return spec;
}

/**
 * Add OpenAPI security requirement to a route
 * @param app Fastify instance
 * @param path Route path
 * @param method HTTP method
 * @param securityScheme Security scheme name
 */
export function addSecurityToRoute(
  app: FastifyInstance,
  path: string,
  method: string,
  securityScheme: string
): void {
  // In practice, this would modify the route schema to include security
  // For now, this is a placeholder for the OpenAPI generation integration
}

/**
 * Add a tagged operation to OpenAPI spec
 * @param spec OpenAPI spec to modify
 * @param path Route path
 * @param method HTTP method
 * @param tags Tag names
 * @param operation Operation descriptor
 */
export function addOperation(
  spec: OpenAPISpec,
  path: string,
  method: string,
  tags: string[],
  operation: Partial<OpenAPIOperation>
): void {
  if (!spec.paths[path]) {
    spec.paths[path] = {};
  }
  const lowerMethod = method.toLowerCase() as keyof OpenAPIOperation;
  spec.paths[path][lowerMethod] = {
    ...spec.paths[path]?.[lowerMethod],
    tags,
    ...operation,
  };
}

/**
 * Add a schema to OpenAPI components
 * @param spec OpenAPI spec to modify
 * @param name Schema name
 * @param schema Schema definition
 */
export function addSchema(
  spec: OpenAPISpec,
  name: string,
  schema: Record<string, unknown>
): void {
  spec.components!.schemas![name] = schema;
}

export type { OpenAPISpec, OpenAPIPath, OpenAPIOperation, OpenAPIParameter, OpenAPIResponse, OpenAPIInfo, OpenAPIServer, OpenAPISpec };