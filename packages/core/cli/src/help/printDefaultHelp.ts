import type { CliDefinition, CliOutput, Command } from "../types";
import { formatCommandLine } from "./formatCommandLine";

export function printDefaultHelp(
  definition: CliDefinition,
  commands: Command[],
  output: CliOutput,
): void {
  const cliName = definition.name;

  output.write(`\nUsage: ${cliName} [command] [options]\n`);

  if (definition.description) {
    output.write(`${definition.description}\n`);
  }

  if (commands.length > 0) {
    output.write("Commands:");
    for (const cmd of commands) {
      output.write(formatCommandLine(cmd));
    }
    output.write();
  }

  output.write("Global Options:");
  output.write("  -h, --help           Show help");
  output.write("  -v, --version        Show version");
  if (definition.verbose?.enabled === true) {
    output.write("  --verbose            Enable verbose output");
  }
  output.write();

  output.write(`Run '${cliName} help <command>' for more information.\n`);
}
