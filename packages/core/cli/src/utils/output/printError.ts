import type { ILogger } from "@damatjs/logger";

export function printError(
  logger: ILogger,
  message: string,
  suggestion?: string
): void {
  console.log("");
  logger.error(message);
  if (suggestion) {
    console.log("");
    console.log(suggestion);
  }
  console.log("");
}
