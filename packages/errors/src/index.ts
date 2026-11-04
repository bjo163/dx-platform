export class WTAgentError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number = 500) {
    super(message);
    this.name = 'WTAgentError';
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends WTAgentError {
  constructor(message: string, status: number = 400) {
    super('VALIDATION_ERROR', message, status);
  }
}

export class NotFoundError extends WTAgentError {
  constructor(resource: string, id: string, status: number = 404) {
    super(`NOT_FOUND`, `${resource} with id ${id} not found`, status);
  }
}

export class ConflictError extends WTAgentError {
  constructor(message: string, status: number = 409) {
    super('CONFLICT_ERROR', message, status);
  }
}

export class ProviderError extends WTAgentError {
  constructor(provider: string, message: string, status: number = 409) {
    super('PROVIDER_ERROR', `Provider ${provider}: ${message}`, status);
  }
}

export class SandboxError extends WTAgentError {
  constructor(operation: string, path: string, status: number = 403) {
    super('SANDBOX_ERROR', `${operation} not allowed for path: ${path}`, status);
  }
}

export class ApprovalError extends WTAgentError {
  constructor(tool: string, approvalId: string, status: number = 409) {
    super('APPROVAL_ERROR', `Approval required for ${tool} (ID: ${approvalId})`, status);
  }
}

export const enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  PROVIDER = 'PROVIDER',
  SANDBOX = 'SANDBOX',
  APPROVAL = 'APPROVAL',
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
}

export function isWTAgentError(error: unknown): error is WTAgentError {
  return error instanceof WTAgentError;
}

export function errorCodeStatus(code: ErrorCode): number {
  const mapping: Record<ErrorCode, number> = {
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.PROVIDER]: 409,
    [ErrorCode.SANDBOX]: 403,
    [ErrorCode.APPROVAL]: 409,
    [ErrorCode.NETWORK]: 0,
    [ErrorCode.RATE_LIMIT]: 429,
    [ErrorCode.AUTHENTICATION]: 401,
    [ErrorCode.AUTHORIZATION]: 403,
  };
  return mapping[code];
}