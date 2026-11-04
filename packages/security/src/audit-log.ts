// Audit logging for NeuralForge

import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as randomUUID } from 'node:crypto';

export type AuditLevel = 'info' | 'warning' | 'error' | 'critical';

export interface AuditEvent {
  id: string;
  timestamp: string;
  level: AuditLevel;
  action: string;
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  status?: number;
  details?: Record<string, unknown>;
  outcome?: 'success' | 'failure' | 'partial';
}

export interface AuditLoggerOptions {
  logDir: string;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  redactSensitive?: string[];
}

export class AuditLogger {
  private logDir: string;
  private includeRequestBody: boolean;
  private includeResponseBody: boolean;
  private redactSensitive: RegExp[];

  constructor(opts: AuditLoggerOptions) {
    this.logDir = opts.logDir;
    this.includeRequestBody = opts.includeRequestBody ?? false;
    this.includeResponseBody = opts.includeResponseBody ?? false;
    this.redactSensitive = opts.redactSensitive ?? ['password', 'token', 'secret', 'key'];

    // Compile redaction regexes
    this.redactSensitive = this.redactSensitive.map((s) => new RegExp(s, 'i'));
  }

  async init(): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true, mode: 0o700 });
  }

  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const auditEvent: AuditEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    const filePath = path.join(this.logDir, `${auditEvent.id}.jsonl`);

    // Redact sensitive data
    const redact = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && this.redactSensitive.some((r) => r.test(value))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = redact(value as Record<string, unknown>);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    const safeEvent = {
      ...auditEvent,
      details: auditEvent.details ? redact(auditEvent.details as Record<string, unknown>) : undefined,
    };

    await fs.appendFile(filePath, JSON.stringify(safeEvent) + '\n', { mode: 0o600 });
    return auditEvent;
  }

  async logRequestResponse(
    req: any,
    res: any,
    level: AuditLevel = 'info',
    extra?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      action: `${req.method} ${req.url}`,
      level,
      userId: req.user?.id ?? req.query?.userId ?? undefined,
      requestId: req.id ?? undefined,
      ip: req.ip ?? undefined,
      userAgent: req.get('user-agent') ?? undefined,
      path: req.path ?? undefined,
      method: req.method ?? undefined,
      status: res?.statusCode ?? undefined,
      ...extra,
    });
  }
}

export function createAuditLogger(opts: AuditLoggerOptions): AuditLogger {
  const logger = new AuditLogger(opts);
  logger.init().catch((err) => {
    console.error('Audit logger initialization failed:', err);
  });
  return logger;
}

export type { AuditEvent, AuditLevel, AuditLoggerOptions };