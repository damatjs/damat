import type { CAC } from "cac";
import type {
  CliDefinition,
  CliRunResult,
  CliRuntime,
  CommandRegistry,
} from "../types";
import { printCommandSpecificHelp, printDefaultHelp } from "../help";

export function handleHelpCommand(
  cli: CAC,
  definition: CliDefinition,
  runtime: CliRuntime,
  registry: CommandRegistry,
): void {
  cli
    .command("help [command]", "Show help for a command")
    .action((commandName?: string): CliRunResult => {
      if (!commandName) {
        printDefaultHelp(definition, registry.getAll(), runtime.output);
        return { exitCode: 0 };
      }
      const command = registry.get(commandName);
      if (!command) {
        runtime.logger.error(`Unknown command: ${commandName}`);
        return { exitCode: 1, command: commandName };
      }
      printCommandSpecificHelp(definition, command, runtime.output);
      return { exitCode: 0, command: command.name };
    });
}
