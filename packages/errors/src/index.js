export class WTAgentError extends Error {
    code;
    status;
    constructor(code, message, status = 500) {
        super(message);
        this.name = 'WTAgentError';
        this.code = code;
        this.status = status;
    }
}
export class ValidationError extends WTAgentError {
    constructor(message, status = 400) {
        super('VALIDATION_ERROR', message, status);
    }
}
export class NotFoundError extends WTAgentError {
    constructor(resource, id, status = 404) {
        super(`NOT_FOUND`, `${resource} with id ${id} not found`, status);
    }
}
export class ConflictError extends WTAgentError {
    constructor(message, status = 409) {
        super('CONFLICT_ERROR', message, status);
    }
}
export class ProviderError extends WTAgentError {
    constructor(provider, message, status = 409) {
        super('PROVIDER_ERROR', `Provider ${provider}: ${message}`, status);
    }
}
export class SandboxError extends WTAgentError {
    constructor(operation, path, status = 403) {
        super('SANDBOX_ERROR', `${operation} not allowed for path: ${path}`, status);
    }
}
export class ApprovalError extends WTAgentError {
    constructor(tool, approvalId, status = 409) {
        super('APPROVAL_ERROR', `Approval required for ${tool} (ID: ${approvalId})`, status);
    }
}
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["CONFLICT"] = "CONFLICT";
    ErrorCode["PROVIDER"] = "PROVIDER";
    ErrorCode["SANDBOX"] = "SANDBOX";
    ErrorCode["APPROVAL"] = "APPROVAL";
    ErrorCode["NETWORK"] = "NETWORK";
    ErrorCode["RATE_LIMIT"] = "RATE_LIMIT";
    ErrorCode["AUTHENTICATION"] = "AUTHENTICATION";
    ErrorCode["AUTHORIZATION"] = "AUTHORIZATION";
})(ErrorCode || (ErrorCode = {}));
export function isWTAgentError(error) {
    return error instanceof WTAgentError;
}
export function errorCodeStatus(code) {
    const mapping = {
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
