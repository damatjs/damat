import type { ILogger, LoggerConfig, LogContext, LogLevel, LogEntry, RequestLogData } from "./types";
import { LOG_LEVELS } from "./colors";
import { Colorizer } from "./colorizer";
import { Formatter } from "./formatter";
import { ChildLogger } from "./child";
import { FileTransport } from "./file-transport";

export class Logger implements ILogger {
  private minLevel: number;
  private formatter: Formatter;
  private timestampEnabled: boolean;
  private prefix: string | undefined;
  private fileTransport: FileTransport | null = null;

  constructor(config: LoggerConfig = {}) {
    this.minLevel = LOG_LEVELS[config.level ?? "info"];
    this.formatter = new Formatter(config.format ?? "pretty", new Colorizer(config.colors ?? true));
    this.timestampEnabled = config.timestamp ?? true;
    this.prefix = config.prefix;
    if (config.file?.enabled !== false && config.file) {
      this.fileTransport = new FileTransport(config.file);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
    if (!this.shouldLog(level)) return;
    const timestamp = this.timestampEnabled ? this.formatter.getTimestamp() : "";
    const errorInfo = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : undefined;

    if (this.fileTransport) {
      this.fileTransport.log({ timestamp, level, message, context, error: errorInfo } as LogEntry);
    }

    const formatted = this.formatter.formatEntry({ timestamp, level, message, context, error: errorInfo, prefix: this.prefix });

    if (level === "fatal" || level === "error") console.error(formatted);
    else if (level === "warn") console.warn(formatted);
    else console.log(formatted);
  }

  debug(message: string, context?: LogContext): void { this.log("debug", message, context); }
  info(message: string, context?: LogContext): void { this.log("info", message, context); }
  success(message: string, context?: LogContext): void { this.log("success", message, context); }
  warn(message: string, context?: LogContext): void { this.log("warn", message, context); }
  error(message: string, error?: unknown, context?: LogContext): void { this.log("error", message, context, error); }
  fatal(message: string, error?: unknown, context?: LogContext): void { this.log("fatal", message, context, error); }
  skip(message: string, context?: LogContext): void { this.log("skip", message, context); }
  child(context: LogContext): ILogger { return new ChildLogger(this, context, this.prefix); }
  withPrefix(prefix: string): ILogger { return new ChildLogger(this, {}, this.prefix ? `${this.prefix}:${prefix}` : prefix); }
  request(data: RequestLogData): void {
    const level: LogLevel = data.status >= 500 ? "error" : data.status >= 400 ? "warn" : "info";
    this.log(level, `${data.method} ${data.path} ${data.status} ${data.duration}ms`, {
      requestId: data.requestId,
      ...data.identifier?.reduce((acc, { label, value }) => ({ ...acc, [label]: value }), {}),
    }, data.error);
  }
  static create(config?: LoggerConfig): Logger { return new Logger(config); }
  close(): void { if (this.fileTransport) { this.fileTransport.close(); this.fileTransport = null; } }
}
