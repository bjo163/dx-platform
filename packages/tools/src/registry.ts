import type { AgentToolCall, ToolContext, ToolResult, ToolRisk } from "@wtagent/types";
import { toJSONSchema, type ZodType } from "zod";
import { ToolValidationError } from "@wtagent/shared/errors";

// `@wtagent/types` describes the protocol-facing tool shape. The registry also
// carries the execution-only fields (`data`, `stdout`, `stderr`) and the
// per-tool zod schema, so the richer shape is declared here and exported.
export type RegisteredToolRisk = ToolRisk | "write";

export interface ToolExecutionResult extends Omit<
  ToolResult,
  "callId" | "name" | "output" | "operationSignature"
> {
  data?: unknown;
  stdout?: string | null;
  stderr?: string | null;
}

export interface ToolRunResult {
  callId?: string | null;
  name?: string | null;
  ok: boolean;
  message?: string;
  data?: unknown;
  stdout?: string | null;
  stderr?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface RegisteredToolDefinition<
  Args extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  description: string;
  inputDescription: string;
  risk?: RegisteredToolRisk;
  managesTimeout?: boolean;
  requiresVisibleBrowser?: boolean;
  inputSchema: ZodType<Args>;
  execute(args: Args, context: ToolContext): Promise<ToolExecutionResult>;
}

export interface PreparedToolCall<
  Args extends Record<string, unknown> = Record<string, unknown>,
> extends AgentToolCall {
  args: Args;
  definition: RegisteredToolDefinition<Args>;
}

// Fields a tool failure may carry; every read below keeps the original
// `error?.field` guard so unknown throwables stay inert.
interface ToolFailureLike {
  message?: string;
  stack?: string;
  code?: string;
  recoverable?: boolean;
  details?: unknown;
  completionUnknown?: unknown;
  meta?: Record<string, unknown>;
}

type ToolOutcome =
  | { type: "result"; result: ToolExecutionResult }
  | { type: "error"; error: unknown }
  | { type: "timeout" };

export class ToolRegistry {
  #definitions = new Map<string, RegisteredToolDefinition>();

  register<Args extends Record<string, unknown>>(
    definition: RegisteredToolDefinition<Args>,
  ): this {
    if (!definition?.name || typeof definition.execute !== "function") {
      throw new Error("Tool definition requires name and execute.");
    }
    if (this.#definitions.has(definition.name)) {
      throw new Error(`Duplicate tool: ${definition.name}`);
    }
    this.#definitions.set(definition.name, definition);
    return this;
  }

  list() {
    return [...this.#definitions.values()].map((definition) => ({
      name: definition.name,
      description: definition.description,
      inputDescription: definition.inputDescription,
      risk: definition.risk ?? "execute",
    }));
  }

  // JSON Schema-speaking clients (MCP hosts, function-calling gateways) need the
  // argument shape rather than the XML example. The conversion lives here
  // because this package owns the zod schemas and therefore owns zod.
  describe() {
    return [...this.#definitions.values()].map((definition) => ({
      name: definition.name,
      description: definition.description,
      risk: definition.risk ?? "execute",
      inputSchema: toJSONSchema(definition.inputSchema, { io: "input" }),
    }));
  }

  validate(toolCall: AgentToolCall): PreparedToolCall {
    const definition = this.#definitions.get(toolCall.name);
    if (!definition) {
      throw new ToolValidationError(`Unknown tool: ${toolCall.name}`);
    }

    const result = definition.inputSchema.safeParse(toolCall.args ?? {});
    if (!result.success) {
      throw new ToolValidationError(
        `Invalid arguments for ${toolCall.name}: ${result.error.message}`,
        { details: result.error.issues },
      );
    }

    return {
      ...toolCall,
      args: result.data,
      definition,
    };
  }

  async execute<Args extends Record<string, unknown>>(
    preparedCall: PreparedToolCall<Args>,
    context: ToolContext,
  ): Promise<ToolRunResult> {
    const execution = Promise.resolve().then(
      () => preparedCall.definition.execute(preparedCall.args, context),
    );
    const timeoutMs: number | null = preparedCall.definition.managesTimeout
      ? null
      : Number(context.toolTimeoutMs);
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      let outcome: ToolOutcome;
      if (timeoutMs !== null && Number.isSafeInteger(timeoutMs) && timeoutMs > 0) {
        outcome = await Promise.race([
          execution.then(
            (result): ToolOutcome => ({ type: "result", result }),
            (error): ToolOutcome => ({ type: "error", error }),
          ),
          new Promise<ToolOutcome>((resolve) => {
            timer = setTimeout(
              () => resolve({ type: "timeout" }),
              timeoutMs,
            );
            timer.unref?.();
          }),
        ]);
      } else {
        outcome = await execution.then(
          (result): ToolOutcome => ({ type: "result", result }),
          (error): ToolOutcome => ({ type: "error", error }),
        );
      }

      if (outcome.type === "timeout") {
        execution.catch(() => undefined);
        const completionUnknown = preparedCall.definition.risk !== "read";
        return {
          callId: preparedCall.id,
          name: preparedCall.name,
          ok: false,
          message: completionUnknown
            ? (
              `Tool exceeded the ${timeoutMs}ms runtime guard. `
              + "The operation may still complete because it does not support "
              + "hard cancellation; completion is unknown."
            )
            : `Tool exceeded the ${timeoutMs}ms runtime guard.`,
          meta: {
            timedOut: true,
            completionUnknown,
            recoverable: true,
          },
        };
      }

      if (outcome.type === "error") {
        throw outcome.error;
      }

      const result = outcome.result;
      return {
        callId: preparedCall.id,
        name: preparedCall.name,
        ok: Boolean(result.ok),
        message: result.message ?? "",
        data: result.data,
        stdout: result.stdout,
        stderr: result.stderr,
        meta: result.meta,
      };
    } catch (error) {
      const failure = error as ToolFailureLike;
      const meta = {
        ...(failure?.meta ?? {}),
        ...(failure?.code ? {
          code: failure.code,
          recoverable: failure.recoverable ?? false,
          ...(failure.details ? { details: failure.details } : {}),
        } : {}),
        ...(failure?.completionUnknown ? {
          completionUnknown: true,
          recoverable: failure.recoverable ?? true,
        } : {}),
      };
      return {
        callId: preparedCall.id,
        name: preparedCall.name,
        ok: false,
        message: failure.message,
        stderr: failure.stack,
        meta: Object.keys(meta).length ? meta : undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
