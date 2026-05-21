import "dotenv/config";
import { Logger } from "@damatjs/logger";
import type { CliOptions, CommandContext } from "./types";
import { getCommand, getAllCommands } from "./registry";
import { loadConfig, type DamatConfig } from "./config";

export async function runCli(options: CliOptions = {}): Promise<void> {
  const logger = new Logger({ timestamp: false });
  const [commandName, ...args] = process.argv.slice(2);

  try {
    const config = await loadConfig();

    if (!commandName || commandName === "help" || commandName === "--help" || commandName === "-h") {
      printHelp(logger);
      process.exit(0);
    }

    const command = getCommand(commandName);

    if (!command) {
      logger.error(`Unknown command: ${commandName}`);
      console.log("");
      printHelp(logger);
      process.exit(1);
    }

    const ctx: CommandContext = {
      args,
      options: buildOptions(options, config),
      logger,
    };

    const result = await command.handler(ctx);
    process.exit(result.exitCode);
  } catch (error) {
    console.log("");
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : error}`);
    console.log("");
    process.exit(1);
  }
}

function buildOptions(options: CliOptions, config: DamatConfig): CliOptions {
  return {
    activeModules: Object.keys(config),
    config: config,
    verbose: options.verbose ?? false,
  };
}

function printHelp(logger: Logger): void {
  const commands = getAllCommands();

  console.log(`
┌─────────────────────────────────────────────────────────────────┐
│                      damat-orm                                  │
├─────────────────────────────────────────────────────────────────┤
│  DamatJS ORM CLI                                                │
└─────────────────────────────────────────────────────────────────┘

Usage: damat-orm [command] [args...]

Commands:`);

  for (const cmd of commands) {
    console.log(`  ${cmd.name.padEnd(20)} ${cmd.description}`);
  }

  console.log(`
Environment:
  DATABASE_URL        PostgreSQL connection string (for migrations)

Examples:
  damat-orm generate types user
  damat-orm migrate up
  damat-orm migrate status

Run 'damat-orm help' for more information.
`);
}

export * from "./types";
export * from "./registry";
