interface NeuralForgeErrorOptions extends ErrorOptions {
  code?: string;
  recoverable?: boolean;
  details?: unknown;
}

export class NeuralForgeError extends Error {
  code: string;
  recoverable: boolean;
  details: unknown;

  constructor(message: string, options: NeuralForgeErrorOptions = {}) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = options.code ?? "WTAGENT_ERROR";
    this.recoverable = options.recoverable ?? false;
    this.details = options.details;
  }
}

export class ProtocolError extends NeuralForgeError {
  constructor(message: string, options: NeuralForgeErrorOptions = {}) {
    super(message, {
      code: "PROTOCOL_ERROR",
      recoverable: true,
      ...options,
    });
  }
}

export class BrowserAdapterError extends NeuralForgeError {
  constructor(message: string, options: NeuralForgeErrorOptions = {}) {
    super(message, {
      code: "BROWSER_ADAPTER_ERROR",
      recoverable: true,
      ...options,
    });
  }
}

export class ToolValidationError extends NeuralForgeError {
  constructor(message: string, options: NeuralForgeErrorOptions = {}) {
    super(message, {
      code: "TOOL_VALIDATION_ERROR",
      recoverable: true,
      ...options,
    });
  }
}

export class PolicyDeniedError extends NeuralForgeError {
  constructor(message: string, options: NeuralForgeErrorOptions = {}) {
    super(message, {
      code: "POLICY_DENIED",
      recoverable: true,
      ...options,
    });
  }
}

// Compatibility alias for integrations written before the product rename.
export { NeuralForgeError as WebAgentError };