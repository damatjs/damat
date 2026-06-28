import { cac } from "cac";
import { Logger } from "@damatjs/logger";
import type { CliConfig, CommandResult } from "../types";
import { getRegistry, clearRegistry } from "../registry";
import { reportError, getExitCode } from "../utils/output";
import { printDefaultHelp } from "../help";
import { printBanner } from "../utils/banner";
import { handleHelpCommand } from "./helpCommand";
import { registerSingleCommand } from "./registerCommand";
import { resolveCommandName } from "./resolveCommand";
import { buildCommandContext, parseCommandArgs } from "./buildCommand";

export async function runCli(config: CliConfig): Promise<void> {
  if (!config.name) {
    throw new Error("CLI config must have a 'name' property");
  }
  if (!config.version) {
    throw new Error("CLI config must have a 'version' property");
  }

  clearRegistry();

  const cli = cac(config.name);
  const logger = new Logger({ timestamp: false });

  cli.version(config.version);
  cli.help();

  const verboseEnabled = config.verbose?.enabled !== false;
  if (verboseEnabled) {
    cli.option("--verbose", "Enable verbose output");
  }

  for (const cmd of config.commands) {
    getRegistry().register(cmd);
  }

  handleHelpCommand(cli, config, logger);

  for (const cmd of getRegistry().getAll()) {
    registerSingleCommand(cli, cmd, config, logger);
  }

  const args = process.argv.slice(2);
  const commandName = resolveCommandName(args);

  const shouldShowBanner = config.banner !== false;
  if (shouldShowBanner && config.banner) {
    printBanner(config, config.banner);
  } else if (shouldShowBanner) {
    printBanner(config);
  }

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printDefaultHelp(config, getRegistry().getAll());
    process.exit(0);
  }

  if (commandName) {
    const cmd = getRegistry().get(commandName);
    if (!cmd) {
      // The first token isn't a known command. If a default command is
      // configured, treat the whole arg list as that command's arguments
      // (e.g. `create-damat-app my-app` -> `create my-app`). Aliases are
      // registered as commands, so this only ever catches genuine arguments.
      const fallback = config.defaultCommand
        ? getRegistry().get(config.defaultCommand)
        : undefined;
      if (fallback) {
        const { options, positional } = parseCommandArgs(args, fallback.options);
        const ctx = buildCommandContext(fallback.name, options, logger, config);
        const result = await fallback.handler({ ...ctx, args: positional });
        process.exit(result.exitCode);
      }

      logger.error(`Unknown command: ${commandName}`);
      console.log("");
      printDefaultHelp(config, getRegistry().getAll());
      process.exit(1);
    }

    const subcommandName = cmd.subcommands && args.length > 1 ? args[1] : undefined;
    if (subcommandName) {
      const fullName = `${cmd.name}:${subcommandName}`;
      const subcmd = getRegistry().get(fullName) || getRegistry().get(subcommandName);

      if (subcmd && subcmd !== cmd) {
        const { options, positional } = parseCommandArgs(
          args.slice(2),
          subcmd.options,
        );
        const ctx = buildCommandContext(fullName, options, logger, config);
        let result: CommandResult;
        try {
          result = await subcmd.handler({
            ...ctx,
            args: positional,
          });
        } catch (error) {
          reportError(logger, error, { prefix: "Command failed" });
          if (config.onError) {
            config.onError(
              error instanceof Error ? error : new Error(String(error)),
              { ...ctx, args: positional },
            );
          }
          process.exit(getExitCode(error));
        }
        process.exit(result.exitCode);
      }
    }
  }

  cli.parse();
}
