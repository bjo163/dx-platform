// The canonical error body for every API, MCP, and CLI response. The shape
// matches what apps/api already sends (`{ error: { code, message } }`) and adds
// the two fields a client needs to decide what to do: whether to retry, and
// which log line to quote when reporting the problem.
//
// Nothing here copies a stack trace, an absolute path, or an environment value
// onto the wire: `toErrorEnvelope` is the only supported way to build one from
// an unknown thrown value.

import { NeuralForgeError } from "./errors.js";

export interface ErrorEnvelopeBody {
  code: string;
  message: string;
  /** True when retrying the same request could succeed, e.g. a transient timeout. */
  recoverable: boolean;
  /** Matches the correlationId on the server log for this request. */
  correlationId: string | null;
  /** Caller-safe context. Scalars only; secrets and paths do not belong here. */
  details: Record<string, string | number | boolean | null> | null;
}

export interface ErrorEnvelope {
  error: ErrorEnvelopeBody;
}

export const UNKNOWN_ERROR_CODE = "INTERNAL_ERROR";
export const UNKNOWN_ERROR_MESSAGE = "The request could not be completed.";

// key=value / key: value pairs and bare bearer tokens, for the case where an
// upstream error message interpolated a header or a configuration line.
const SECRET_ASSIGNMENT = /\b((?:[a-z0-9_-]*(?:api[_-]?key|token|secret|password|passwd|credential|authorization|access[_-]?key)[a-z0-9_-]*))\s*[:=]\s*(\S+)/gi;
const BEARER_TOKEN = /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
// Absolute filesystem paths leak the account name of whoever ran the process.
const ABSOLUTE_PATH = /(?:[A-Za-z]:\\|\/(?:home|Users|var|usr|opt|srv)\/|\/tmp\/)\S+/g;
// Non-global twin: a `/g` pattern carries lastIndex, so reusing it in .test()
// would make the check skip alternating keys.
const SECRET_KEY_NAME = /[a-z0-9_-]*(?:api[_-]?key|token|secret|password|passwd|credential|authorization|access[_-]?key)[a-z0-9_-]*/i;

export function redact(text: string): string {
  return String(text)
    // Bearer first: the assignment pattern would otherwise consume only the
    // word "Bearer" and leave the token behind.
    .replace(BEARER_TOKEN, "Bearer [redacted]")
    .replace(SECRET_ASSIGNMENT, (_match, key: string) => `${key}=[redacted]`)
    .replace(ABSOLUTE_PATH, "[path]");
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const body = (value as { error?: unknown }).error;
  if (typeof body !== "object" || body === null) return false;
  const { code, message } = body as { code?: unknown; message?: unknown };
  return typeof code === "string" && code.length > 0 && typeof message === "string";
}

/**
 * Convert a thrown value into a body safe to send to a client. The original
 * error must go to the server log, never to this envelope.
 */
export function toErrorEnvelope(
  error: unknown,
  options: { correlationId?: string | null; defaultMessage?: string } = {},
): ErrorEnvelope {
  const fallback = options.defaultMessage ?? UNKNOWN_ERROR_MESSAGE;
  const correlationId = options.correlationId ? redact(String(options.correlationId)).slice(0, 200) : null;

  if (error instanceof NeuralForgeError) {
    return {
      error: {
        code: String(error.code),
        message: redact(String(error.message)).slice(0, 500) || fallback,
        recoverable: Boolean(error.recoverable),
        correlationId,
        details: sanitiseDetails(error.details),
      },
    };
  }

  // A foreign Error still gets its message, but with a generic code: we cannot
  // claim a contract for an error type this package does not own.
  if (error instanceof Error) {
    return {
      error: {
        code: UNKNOWN_ERROR_CODE,
        message: redact(String(error.message)).slice(0, 500) || fallback,
        recoverable: false,
        correlationId,
        details: null,
      },
    };
  }

  // A thrown string or object is arbitrary user-adjacent content: never echo it.
  return {
    error: { code: UNKNOWN_ERROR_CODE, message: fallback, recoverable: false, correlationId, details: null },
  };
}

// Only flat scalars survive, and only when their key does not look secret.
function sanitiseDetails(
  details: unknown,
): Record<string, string | number | boolean | null> | null {
  if (typeof details !== "object" || details === null || Array.isArray(details)) return null;
  const clean: Record<string, string | number | boolean | null> = {};
  let kept = 0;
  for (const [key, value] of Object.entries(details)) {
    if (kept >= 20) break;
    // Any key naming a credential or a local path is dropped, not redacted: its
    // value would be an absolute path to a user's directory.
    if (SECRET_KEY_NAME.test(key) || /key|token|secret|password|credential|path|file|dir/i.test(key)) continue;
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      clean[key] = typeof value === "string" ? redact(value).slice(0, 300) : value;
      kept += 1;
    }
  }
  return kept > 0 ? clean : null;
}
