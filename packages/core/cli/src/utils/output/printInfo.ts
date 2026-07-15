import type { CliLogger, CliOutput } from "../../types";

export function printInfo(
  logger: CliLogger,
  output: CliOutput,
  message: string,
  details?: string,
): void {
  output.write();
  logger.info(message);
  if (details) {
    output.write(details);
  }
  output.write();
}
