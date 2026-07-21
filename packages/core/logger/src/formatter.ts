import type { LogLevel, LogFormat } from "./types";
import { Colorizer } from "./colorizer";

export class Formatter {
  private colorizer: Colorizer;
  private format: LogFormat;

  constructor(format: LogFormat, colorizer: Colorizer) {
    this.format = format;
    this.colorizer = colorizer;
  }

  getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const ms = now.getMilliseconds().toString().padStart(3, "0");
    return `${date} ${time}.${ms}`;
  }

  formatEntry(entry: {
    timestamp: string;
    level: LogLevel;
    message: string;
    context: Record<string, unknown> | undefined;
    error:
      { name: string; message: string; stack: string | undefined } | undefined;
    prefix: string | undefined;
  }): string {
    if (this.format === "json") {
      return JSON.stringify(entry);
    }

    const parts: string[] = [];

    if (entry.timestamp) {
      parts.push(this.colorizer.timestamp(entry.timestamp));
    }

    parts.push(this.colorizer.level(entry.level));

    if (entry.prefix) {
      parts.push(this.colorizer.prefix(entry.prefix));
    }

    parts.push(this.colorizer.message(entry.message, entry.level));

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(this.colorizer.context(entry.context));
    }

    let output = parts.join(" ");

    if (entry.error) {
      output += this.colorizer.errorInfo(entry.error);
    }

    return output;
  }
}
