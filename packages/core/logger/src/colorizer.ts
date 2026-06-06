import type { LogLevel, LogContext } from "./types";
import { COLORS, LEVEL_STYLES } from "./colors";

export class Colorizer {
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled && this.supportsColor();
  }

  private supportsColor(): boolean {
    if (typeof process === "undefined") return false;
    if (process.env.NO_COLOR) return false;
    if (process.env.FORCE_COLOR) return true;
    if (process.env.TERM === "dumb") return false;
    return process.stdout?.isTTY ?? false;
  }

  colorize(text: string, color: string): string {
    return this.enabled ? `${color}${text}${COLORS.reset}` : text;
  }

  bold(text: string): string {
    return this.colorize(text, COLORS.bold);
  }

  dim(text: string): string {
    return this.colorize(text, COLORS.dim);
  }

  timestamp(ts: string): string {
    return this.dim(ts);
  }

  level(level: LogLevel): string {
    const style = LEVEL_STYLES[level];
    const badge = this.colorize(style.badge, style.color);
    const label = this.colorize(style.label.padEnd(5), style.color);
    return `${badge} ${label}`;
  }

  message(message: string, level: LogLevel): string {
    if (level === "error" || level === "fatal") {
      return this.colorize(message, COLORS.red);
    }
    if (level === "warn") {
      return this.colorize(message, COLORS.yellow);
    }
    if (level === "success") {
      return this.colorize(message, COLORS.green);
    }
    if (level === "skip") {
      return this.colorize(message, COLORS.dim);
    }
    if (level === "cached") {
      return this.colorize(message, COLORS.cyan);
    }
    return message;
  }

  context(context: LogContext): string {
    if (Object.keys(context).length === 0) return "";
    return this.dim(JSON.stringify(context));
  }

  errorInfo(error: { name: string; message: string; stack: string | undefined }): string {
    const name = this.colorize(error.name, COLORS.red + COLORS.bold);
    const message = this.colorize(error.message, COLORS.red);
    let output = `\n${name}: ${message}`;
    if (error.stack) output += `\n${this.dim(error.stack)}`;
    return output;
  }

  prefix(prefix: string): string {
    return this.colorize(`[${prefix}]`, COLORS.magenta);
  }
}
