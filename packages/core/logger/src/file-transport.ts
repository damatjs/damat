import { existsSync, mkdirSync, appendFileSync, statSync, renameSync } from "fs";
import { join } from "path";
import type { LogEntry, FileTransportConfig } from "./types";

const LEVEL_EMOJI = { 
  debug: "🔍", 
  info: "ℹ️", 
  success: "✅", 
  warn: "⚠️", 
  error: "❌", 
  fatal: "💀",
  skip: "⏭️",
} as const;

export class FileTransport {
  private dir: string;
  private maxSizeBytes: number;
  private buffer: string[] = [];
  private mdBuffer: string[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: FileTransportConfig = {}) {
    this.dir = config.dir ?? "logs";
    this.maxSizeBytes = config.maxSizeBytes ?? 10 * 1024 * 1024;
    if (!this.isEnabled()) return;
    this.ensureDir();
    if (config.bufferFlushMs !== 0) {
      this.flushInterval = setInterval(() => this.flush(), config.bufferFlushMs ?? 1000);
    }
  }

  private isEnabled(): boolean {
    return process.env.LOGGING_FILE_ON === "true" || process.env.LOGGING_FILE_ON === "1";
  }

  private ensureDir(): void {
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
  }

  private getDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  private getPath(filename: string, ext: string): string {
    return join(this.dir, `${this.getDate()}_${filename}.${ext}`);
  }

  private rotate(filepath: string): void {
    if (!existsSync(filepath)) return;
    if (statSync(filepath).size >= this.maxSizeBytes) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      renameSync(filepath, filepath.replace(/\.(\w+)$/, `_${ts}.$1`));
    }
  }

  private write(filepath: string, content: string): void {
    this.rotate(filepath);
    appendFileSync(filepath, content, "utf-8");
  }

  private formatLog(entry: LogEntry): string {
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const err = entry.error ? `\n  ${entry.error.name}: ${entry.error.message}\n  ${entry.error.stack ?? ""}` : "";
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${ctx}${err}\n`;
  }

  private formatMd(entry: LogEntry): string {
    const emoji = LEVEL_EMOJI[entry.level] ?? "📝";
    let md = `## ${emoji} ${entry.level.toUpperCase()} - ${entry.timestamp}\n\n**Message:** ${entry.message}\n\n`;
    if (entry.context && Object.keys(entry.context).length > 0) {
      md += `**Context:**\n\`\`\`json\n${JSON.stringify(entry.context, null, 2)}\n\`\`\`\n\n`;
    }
    if (entry.error) {
      md += `**Error:** ${entry.error.name}: ${entry.error.message}\n\n`;
      if (entry.error.stack) md += `\`\`\`\n${entry.error.stack}\n\`\`\`\n\n`;
    }
    return md + "---\n\n";
  }

  log(entry: LogEntry): void {
    if (!this.isEnabled()) return;
    this.buffer.push(this.formatLog(entry));
    this.mdBuffer.push(this.formatMd(entry));
  }

  flush(): void {
    if (this.buffer.length > 0) {
      this.write(this.getPath("all", "log"), this.buffer.join(""));
      this.write(this.getPath("all", "md"), this.mdBuffer.join(""));
      this.buffer = [];
      this.mdBuffer = [];
    }
  }

  close(): void {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.flush();
  }
}
