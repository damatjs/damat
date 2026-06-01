import type { CAC } from "cac";
import type { CliConfig } from "../types";
import { Logger } from "@damatjs/logger";
import { getRegistry } from "../registry";
import { printDefaultHelp, printCommandSpecificHelp } from "../help";

export function handleHelpCommand(
  cli: CAC,
  config: CliConfig,
  logger: Logger
): void {
  cli.command("help [command]", "Show help for a command").action((commandName?: string) => {
    if (commandName) {
      const cmd = getRegistry().get(commandName);
      if (!cmd) {
        logger.error(`Unknown command: ${commandName}`);
        process.exit(1);
      }
      printCommandSpecificHelp(config, cmd);
    } else {
      printDefaultHelp(config, getRegistry().getAll());
    }
    process.exit(0);
  });
}
