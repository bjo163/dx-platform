export declare class WTAgentError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status?: number);
}
export declare class ValidationError extends WTAgentError {
    constructor(message: string, status?: number);
}
export declare class NotFoundError extends WTAgentError {
    constructor(resource: string, id: string, status?: number);
}
export declare class ConflictError extends WTAgentError {
    constructor(message: string, status?: number);
}
export declare class ProviderError extends WTAgentError {
    constructor(provider: string, message: string, status?: number);
}
export declare class SandboxError extends WTAgentError {
    constructor(operation: string, path: string, status?: number);
}
export declare class ApprovalError extends WTAgentError {
    constructor(tool: string, approvalId: string, status?: number);
}
export declare const enum ErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    PROVIDER = "PROVIDER",
    SANDBOX = "SANDBOX",
    APPROVAL = "APPROVAL",
    NETWORK = "NETWORK",
    RATE_LIMIT = "RATE_LIMIT",
    AUTHENTICATION = "AUTHENTICATION",
    AUTHORIZATION = "AUTHORIZATION"
}
export declare function isWTAgentError(error: unknown): error is WTAgentError;
export declare function errorCodeStatus(code: ErrorCode): number;
