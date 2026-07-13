import type { ILogger } from "@damatjs/logger";

export function printSuccess(
  logger: ILogger,
  message: string,
  details?: string,
): void {
  console.log("");
  logger.success(message);
  if (details) {
    console.log(details);
  }
  console.log("");
}
