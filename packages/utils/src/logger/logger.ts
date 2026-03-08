import type {
  LogLevel,
  LogFormat,
  LogContext,
  LoggerConfig,
  LogEntry,
  ILogger,
} from "./types";
import { ChildLogger } from "./childLogger";
import { LOG_LEVELS } from "./data";

export class Logger implements ILogger {
  private minLevel: number;
  private format: LogFormat;

  constructor(config: LoggerConfig) {
    this.minLevel = LOG_LEVELS[config.logLevel];
    this.format = config.logFormat;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private formatEntry(entry: LogEntry): string {
    if (this.format === "json") {
      return JSON.stringify(entry);
    }

    // Pretty format for development
    const levelColors: Record<LogLevel, string> = {
      debug: "\x1b[36m", // cyan
      info: "\x1b[32m", // green
      warn: "\x1b[33m", // yellow
      error: "\x1b[31m", // red
    };
    const reset = "\x1b[0m";
    const dim = "\x1b[2m";

    let output = `${dim}${entry.timestamp}${reset} `;
    output += `${levelColors[entry.level]}${entry.level.toUpperCase().padEnd(5)}${reset} `;
    output += entry.message;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${dim}${JSON.stringify(entry.context)}${reset}`;
    }

    if (entry.error) {
      output += `\n${levelColors.error}${entry.error.name}: ${entry.error.message}${reset}`;
      if (entry.error.stack) {
        output += `\n${dim}${entry.error.stack}${reset}`;
      }
    }

    return output;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = this.formatEntry(entry);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log("error", message, context, error);
  }

  request(data: {
    requestId: string;
    method: string;
    path: string;
    status: number;
    duration: number;
    userId?: string;
    teamId?: string;
    apiKeyId?: string;
    error?: Error;
  }): void {
    const level =
      data.status >= 500 ? "error" : data.status >= 400 ? "warn" : "info";
    this.log(
      level,
      `${data.method} ${data.path} ${data.status} ${data.duration}ms`,
      {
        requestId: data.requestId,
        userId: data.userId,
        teamId: data.teamId,
        apiKeyId: data.apiKeyId,
      },
      data.error,
    );
  }

  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }
}
