import type { ILogger } from "@damatjs/logger";

export function printInfo(
  logger: ILogger,
  message: string,
  details?: string,
): void {
  console.log("");
  logger.info(message);
  if (details) {
    console.log(details);
  }
  console.log("");
}
