/**
 * Migration CLI
 *
 * Main entry point for the migration command-line interface.
 */

import "reflect-metadata";
import "dotenv/config";
import {
  commandUp,
  commandStatus,
  commandCreate,
  commandRevert,
  commandList,
  commandHelp,
  commandUnknown,
} from "./commands";
import { CliOptions } from "../../types";

/**
 * Run the migration CLI.
 *
 * Parses command-line arguments and executes the appropriate command.
 *
 * @param options - CLI configuration options
 *
 * @example
 * ```typescript
 * // scripts/db-migrate.ts
 * import { runCli, createSimpleOrmConfig } from '@damatjs/utils';
 *
 * const ormConfig = createSimpleOrmConfig(
 *   process.env.DATABASE_URL,
 *   [],
 * );
 *
 * runCli({
 *   ormConfig,
 *   modulesDir: './src/modules',
 *   activeModules: ['user', 'billing', 'notifications'],
 * });
 * ```
 */
export async function runCli(options: CliOptions): Promise<void> {
  const [...args] = process.argv.slice(2);

  try {
    let result;

    switch (options.command) {
      // Run pending migrations
      case undefined:
      case "migrate":
      case "up":
        result = await commandUp(options);
        break;

      // Show migration status
      case "status":
        result = await commandStatus(options, args);
        break;

      // Create a new migration
      case "create":
        result = await commandCreate(options, args);
        break;

      // Revert migrations
      case "revert":
        result = await commandRevert(options, args);
        break;

      // List modules
      case "list":
        result = await commandList(options);
        break;

      // Help
      case "help":
      case "--help":
      case "-h":
        result = commandHelp();
        break;

      // Unknown command
      default:
        result = commandUnknown(options.command);
    }

    // Close ORM if opened
    if (result.orm) {
      await result.orm.close();
    }

    process.exit(result.exitCode);
  } catch (error) {
    console.error("");
    console.error("\x1b[31mUnexpected error:\x1b[0m");
    console.error(error instanceof Error ? error.message : error);
    console.error("");
    process.exit(1);
  }
}
