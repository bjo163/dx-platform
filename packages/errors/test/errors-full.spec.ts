import { describe, it, expect } from 'vitest';

import { NeuralForgeError, ValidationError, NotFoundError, ConflictError, ProviderError, SandboxError, ApprovalError, ErrorCode, isNeuralForgeError, errorCodeStatus } from '../src';

describe('NeuralForgeError', () => {
  it('should create error with code, message, and status', () => {
    const error = new NeuralForgeError('TEST_ERROR', 'Test message', 400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.status).toBe(400);
    expect(error.name).toBe('NeuralForgeError');
  });

  it('should default status to 500', () => {
    const error = new NeuralForgeError('TEST_ERROR', 'Test message');
    expect(error.status).toBe(500);
  });

  it('should extend Error', () => {
    const error = new NeuralForgeError('TEST_ERROR', 'Test message');
    expect(error instanceof Error).toBe(true);
  });
});

describe('ValidationError', () => {
  it('should create validation error with default code', () => {
    const error = new ValidationError('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(400);
  });

  it('should accept custom status', () => {
    const error = new ValidationError('Invalid input', 422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(422);
  });
});

describe('NotFoundError', () => {
  it('should create not found error', () => {
    const error = new NotFoundError('Resource', 'id-123');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toContain('Resource with id id-123 not found');
    expect(error.status).toBe(404);
  });

  it('should accept custom status', () => {
    const error = new NotFoundError('Resource', 'id-123', 400);
    expect(error.status).toBe(400);
  });
});

describe('ConflictError', () => {
  it('should create conflict error', () => {
    const error = new ConflictError('Resource already exists');
    expect(error.code).toBe('CONFLICT_ERROR');
    expect(error.status).toBe(409);
  });

  it('should accept custom status', () => {
    const error = new ConflictError('Resource already exists', 403);
    expect(error.status).toBe(403);
  });
});

describe('ProviderError', () => {
  it('should create provider error', () => {
    const error = new ProviderError('openai', 'Rate limit exceeded');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.message).toContain('Provider openai: Rate limit exceeded');
    expect(error.status).toBe(409);
  });

  it('should accept custom status', () => {
    const error = new ProviderError('openai', 'Invalid API key', 401);
    expect(error.status).toBe(401);
  });
});

describe('SandboxError', () => {
  it('should create sandbox error', () => {
    const error = new SandboxError('read', '/etc/passwd');
    expect(error.code).toBe('SANDBOX_ERROR');
    expect(error.message).toContain('read not allowed for path: /etc/passwd');
    expect(error.status).toBe(403);
  });

  it('should accept custom status', () => {
    const error = new SandboxError('write', '/tmp/file', 401);
    expect(error.status).toBe(401);
  });
});

describe('ApprovalError', () => {
  it('should create approval error', () => {
    const error = new ApprovalError('fs.write', 'req-123');
    expect(error.code).toBe('APPROVAL_ERROR');
    expect(error.message).toContain('Approval required for fs.write (ID: req-123)');
    expect(error.status).toBe(409);
  });

  it('should accept custom status', () => {
    const error = new ApprovalError('fs.write', 'req-123', 400);
    expect(error.status).toBe(400);
  });
});

describe('ErrorCode enum', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCode.CONFLICT).toBe('CONFLICT');
    expect(ErrorCode.PROVIDER).toBe('PROVIDER');
    expect(ErrorCode.SANDBOX).toBe('SANDBOX');
    expect(ErrorCode.APPROVAL).toBe('APPROVAL');
    expect(ErrorCode.NETWORK).toBe('NETWORK');
    expect(ErrorCode.RATE_LIMIT).toBe('RATE_LIMIT');
    expect(ErrorCode.AUTHENTICATION).toBe('AUTHENTICATION');
    expect(ErrorCode.AUTHORIZATION).toBe('AUTHORIZATION');
  });
});

describe('isNeuralForgeError', () => {
  it('should identify NeuralForgeError instances', () => {
    const error = new NeuralForgeError('TEST', 'msg');
    expect(isNeuralForgeError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Regular error');
    expect(isNeuralForgeError(error)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isNeuralForgeError(null as any)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isNeuralForgeError(undefined as any)).toBe(false);
  });
});

describe('errorCodeStatus', () => {
  it('should map error codes to status codes', () => {
    expect(errorCodeStatus(ErrorCode.VALIDATION_ERROR)).toBe(400);
    expect(errorCodeStatus(ErrorCode.NOT_FOUND)).toBe(404);
    expect(errorCodeStatus(ErrorCode.CONFLICT)).toBe(409);
    expect(errorCodeStatus(ErrorCode.PROVIDER)).toBe(409);
    expect(errorCodeStatus(ErrorCode.SANDBOX)).toBe(403);
    expect(errorCodeStatus(ErrorCode.APPROVAL)).toBe(409);
    expect(errorCodeStatus(ErrorCode.NETWORK)).toBe(0);
    expect(errorCodeStatus(ErrorCode.RATE_LIMIT)).toBe(429);
    expect(errorCodeStatus(ErrorCode.AUTHENTICATION)).toBe(401);
    expect(errorCodeStatus(ErrorCode.AUTHORIZATION)).toBe(403);
  });
});