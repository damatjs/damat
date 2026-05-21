import type { LoggerInterface } from "../types";

export class DefaultLogger implements LoggerInterface {
  debug(msg: string, meta?: any) {
    if (process.env.NODE_ENV === "development") console.debug(`[DEBUG] ${msg}`, meta || "");
  }
  info(msg: string, meta?: any) { console.info(`[INFO] ${msg}`, meta || ""); }
  warn(msg: string, meta?: any) { console.warn(`[WARN] ${msg}`, meta || ""); }
  error(msg: string, meta?: any) { console.error(`[ERROR] ${msg}`, meta || ""); }
}
