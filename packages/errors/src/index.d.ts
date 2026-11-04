export declare class NeuralForgeError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status?: number);
}
export declare class ValidationError extends NeuralForgeError {
    constructor(message: string, status?: number);
}
export declare class NotFoundError extends NeuralForgeError {
    constructor(resource: string, id: string, status?: number);
}
export declare class ConflictError extends NeuralForgeError {
    constructor(message: string, status?: number);
}
export declare class ProviderError extends NeuralForgeError {
    constructor(provider: string, message: string, status?: number);
}
export declare class SandboxError extends NeuralForgeError {
    constructor(operation: string, path: string, status?: number);
}
export declare class ApprovalError extends NeuralForgeError {
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
export declare function isNeuralForgeError(error: unknown): error is NeuralForgeError;
export declare function errorCodeStatus(code: ErrorCode): number;
