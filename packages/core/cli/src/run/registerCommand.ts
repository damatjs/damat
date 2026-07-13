import type { CAC } from "cac";
import type { CliConfig, Command, CommandResult } from "../types";
import { Logger } from "@damatjs/logger";
import { CliError } from "../errors";
import { reportError, getExitCode } from "../utils/output";
import {
  validateOptions,
  applyDefaults,
  coerceOptions,
} from "../utils/validate";
import { loadConfig } from "../config";
import { buildCommandContext } from "./buildCommand";
import { buildOptionFlag } from "./buildOption";

export function registerSingleCommand(
  cli: CAC,
  cmd: Command,
  config: CliConfig,
  logger: Logger,
): void {
  if (cmd.subcommands) {
    return;
  }

  const cacCmd = cli.command(cmd.name, cmd.description);

  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      cacCmd.alias(alias);
    }
  }

  if (cmd.options) {
    for (const opt of cmd.options) {
      cacCmd.option(buildOptionFlag(opt), opt.description, {
        default: opt.default,
      });
    }
  }

  cacCmd.action(async (options) => {
    const opts = { ...options };
    delete opts._;

    let processedOptions = coerceOptions(opts, cmd.options);
    processedOptions = applyDefaults(processedOptions, cmd.options);

    try {
      validateOptions(processedOptions, cmd.options, cmd.name);
    } catch (error) {
      if (!(error instanceof CliError)) throw error;
      logger.error(error.message);
      process.exit(error.exitCode);
    }

    let projectConfig: unknown;
    try {
      projectConfig = await loadConfig(config.configLoader);
    } catch (error) {
      reportError(logger, error, { prefix: "Failed to load configuration" });
      process.exit(getExitCode(error));
    }

    const ctx = buildCommandContext(cmd.name, processedOptions, logger, config);

    if (projectConfig) {
      ctx.options.config = projectConfig;
    }

    if (ctx.options.verbose) {
      if (config.verbose?.handler !== "manual") {
        logger.info("Verbose mode enabled");
      }
      logger.debug("Verbose mode enabled");
    }

    let result: CommandResult;
    try {
      result = await cmd.handler(ctx);
    } catch (error) {
      reportError(logger, error, { prefix: "Command failed" });
      if (config.onError) {
        config.onError(
          error instanceof Error ? error : new Error(String(error)),
          ctx,
        );
      }
      process.exit(getExitCode(error));
    }
    process.exit(result.exitCode);
  });
}
