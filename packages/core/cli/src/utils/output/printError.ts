import type { CliLogger, CliOutput } from "../../types";

export function printError(
  logger: CliLogger,
  output: CliOutput,
  message: string,
  suggestion?: string,
): void {
  output.write();
  logger.error(message);
  if (suggestion) {
    output.write();
    output.write(suggestion);
  }
  output.write();
}
