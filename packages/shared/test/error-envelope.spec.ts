import { describe, it, expect } from "vitest";
import { NeuralForgeError, ProtocolError } from "../src/errors";
import {
  isErrorEnvelope,
  redact,
  toErrorEnvelope,
  UNKNOWN_ERROR_CODE,
  UNKNOWN_ERROR_MESSAGE,
} from "../src/error-envelope";

describe("ErrorEnvelope", () => {
  it("keeps the shape apps/api already sends", () => {
    const envelope = toErrorEnvelope(new ProtocolError("session lock is held"));
    expect(Object.keys(envelope)).toEqual(["error"]);
    expect(isErrorEnvelope({ error: { code: "NOT_FOUND", message: "File not found." } })).toBe(true);
    expect(isErrorEnvelope({ error: { message: "no code" } })).toBe(false);
    expect(isErrorEnvelope({ message: "flat" })).toBe(false);
    expect(isErrorEnvelope(null)).toBe(false);
  });

  it("carries the domain code and whether a retry could help", () => {
    const envelope = toErrorEnvelope(new ProtocolError("turn timed out"), { correlationId: "job_a1b2c3" });
    expect(envelope.error.code).toBe("PROTOCOL_ERROR");
    expect(envelope.error.recoverable).toBe(true);
    expect(envelope.error.correlationId).toBe("job_a1b2c3");
  });

  it("never sends a stack trace", () => {
    const error = new NeuralForgeError("boom");
    error.stack = "at SecretService.leak (C:\\Users\\bjo16\\src\\vault.ts:12:3)";
    const body = JSON.stringify(toErrorEnvelope(error));
    expect(body).not.toContain("at ");
    expect(body).not.toContain("vault.ts");
    expect(body).not.toContain("stack");
  });

  it("redacts credentials that an upstream interpolated into a message", () => {
    const redacted = redact("openai api_key=sk-live-abcdef0123 Authorization: Bearer eyJhbGciOi.eyJhbGciOi");
    expect(redacted).not.toContain("sk-live-abcdef0123");
    expect(redacted).not.toContain("eyJhbGciOi");
    expect(redacted).toContain("api_key=[redacted]");

    const envelope = toErrorEnvelope(new NeuralForgeError("rejected token=ghp_secretvalue123"));
    expect(envelope.error.message).not.toContain("ghp_secretvalue123");
  });

  it("redacts absolute paths, which name the machine's user", () => {
    const envelope = toErrorEnvelope(
      new NeuralForgeError("cannot read /home/dev/.ssh/id_ed25519 or C:\\Users\\bjo16\\secrets.env"),
    );
    expect(envelope.error.message).not.toContain("/home/dev");
    expect(envelope.error.message).not.toContain("bjo16");
    expect(envelope.error.message).toContain("[path]");
  });

  it("drops details that look like credentials or local paths", () => {
    const error = new NeuralForgeError("upload failed", {
      details: { attempt: 3, timeout: true, apiKey: "sk-live-abc", filePath: "/home/dev/x", nested: { a: 1 } },
    });
    const details = toErrorEnvelope(error).error.details;
    expect(details).toEqual({ attempt: 3, timeout: true });
  });

  it("falls back to a generic code and message for a foreign error", () => {
    const envelope = toErrorEnvelope(new TypeError("x is not a function"));
    expect(envelope.error.code).toBe(UNKNOWN_ERROR_CODE);
    expect(envelope.error.recoverable).toBe(false);
    expect(envelope.error.details).toBeNull();
  });

  it("does not echo an arbitrary thrown value", () => {
    const envelope = toErrorEnvelope("Database connection string was postgres://user:pw@10.0.0.4");
    expect(envelope.error.message).toBe(UNKNOWN_ERROR_MESSAGE);
    expect(JSON.stringify(envelope)).not.toContain("10.0.0.4");
    expect(JSON.stringify(envelope)).not.toContain("postgres");
  });

  it("uses the caller's message only when the error says nothing", () => {
    const envelope = toErrorEnvelope(new Error(""), { defaultMessage: "The job could not start." });
    expect(envelope.error.message).toBe("The job could not start.");
    // A real message is still useful to the user, so it is kept after redaction.
    expect(toErrorEnvelope(new Error("port 3000 is busy"), { defaultMessage: "The job could not start." }).error.message)
      .toBe("port 3000 is busy");
  });
});
