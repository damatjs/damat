import { Logger } from "@damatjs/logger";

const migrationLogger = new Logger({ timestamp: false });

export function log(
  level: "info" | "success" | "warn" | "error" | "skip",
  message: string,
  details?: string,
): void {
  const fullMessage = details ? `${message} ${details}` : message;
  
  switch (level) {
    case "info":
      migrationLogger.info(fullMessage);
      break;
    case "success":
      migrationLogger.success(fullMessage);
      break;
    case "warn":
      migrationLogger.warn(fullMessage);
      break;
    case "error":
      migrationLogger.error(fullMessage);
      break;
    case "skip":
      migrationLogger.skip(fullMessage);
      break;
  }
}

export { separator, successBanner, errorBanner } from "@damatjs/logger";
