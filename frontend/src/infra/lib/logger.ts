import { env } from "../config/env";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

class Logger {
  private logQueue: LogPayload[] = [];
  private readonly BATCH_SIZE = 10;

  private createPayload(level: LogLevel, message: string, context?: Record<string, any>): LogPayload {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  private processLog(payload: LogPayload) {
    // In development, always log to console
    if (env.isDevelopment) {
      const formattedMessage = `[${payload.timestamp}] [${payload.level.toUpperCase()}] ${payload.message}`;
      if (payload.level === "error") console.error(formattedMessage, payload.context || "");
      else if (payload.level === "warn") console.warn(formattedMessage, payload.context || "");
      else if (payload.level === "debug") console.debug(formattedMessage, payload.context || "");
      else console.info(formattedMessage, payload.context || "");
    }

    // In production, batch and send to remote logging service (e.g., Sentry, Datadog, or custom backend audit trail)
    if (env.isProduction) {
      this.logQueue.push(payload);
      if (this.logQueue.length >= this.BATCH_SIZE || payload.level === "error") {
        this.flush();
      }
    }
  }

  private async flush() {
    if (this.logQueue.length === 0) return;
    
    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      // Mock API call to send logs
      // await fetch(`${env.API_URL}/audit/logs`, {
      //   method: "POST",
      //   body: JSON.stringify({ logs: logsToSend }),
      // });
    } catch (e) {
      console.error("Failed to send logs to remote server", e);
      // Re-queue logs if failed, prevent infinite loops by setting a max retry limit in a real app
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.processLog(this.createPayload("info", message, context));
  }

  warn(message: string, context?: Record<string, any>) {
    this.processLog(this.createPayload("warn", message, context));
  }

  error(message: string, context?: Record<string, any>) {
    this.processLog(this.createPayload("error", message, context));
  }

  debug(message: string, context?: Record<string, any>) {
    if (!env.isProduction) {
      this.processLog(this.createPayload("debug", message, context));
    }
  }

  // Specialized Audit Trail method for critical user actions
  audit(action: string, userId: string, details?: Record<string, any>) {
    this.processLog(this.createPayload("info", `AUDIT: ${action}`, { userId, ...details, isAudit: true }));
    // Instantly flush audits for security
    if (env.isProduction) this.flush();
  }
}

export const logger = new Logger();
