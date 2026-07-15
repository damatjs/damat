import type { CliLogger, CliOutput } from "../../types";

export function printSuccess(
  logger: CliLogger,
  output: CliOutput,
  message: string,
  details?: string,
): void {
  output.write();
  logger.success(message);
  if (details) {
    output.write(details);
  }
  output.write();
}
