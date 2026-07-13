import type { CliConfig, Command } from "../types";
import { formatCommandLine } from "./formatCommandLine";

export function printDefaultHelp(config: CliConfig, commands: Command[]): void {
  const cliName = config.name;

  console.log(`\nUsage: ${cliName} [command] [options]\n`);

  if (config.description) {
    console.log(`${config.description}\n`);
  }

  if (commands.length > 0) {
    console.log("Commands:");
    for (const cmd of commands) {
      console.log(formatCommandLine(cmd));
    }
    console.log("");
  }

  console.log("Global Options:");
  console.log("  -h, --help           Show help");
  console.log("  -v, --version        Show version");
  if (config.verbose?.enabled !== false) {
    console.log("  --verbose            Enable verbose output");
  }
  console.log("");

  console.log(`Run '${cliName} help <command>' for more information.\n`);
}
