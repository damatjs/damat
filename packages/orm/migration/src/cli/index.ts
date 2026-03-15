/**
 * Migration CLI
 *
 * Main entry point for the migration command-line interface.
 */

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
import { log } from "../logger";
import type { CliOptions } from "../types";

/**
 * Run the migration CLI.
 *
 * @param options - CLI configuration options
 *
 * @example
 * ```typescript
 * // scripts/db-migrate.ts
 * import { runCli } from '@damatjs/orm-migration';
 *
 * runCli({
 *   database: { url: process.env.DATABASE_URL! },
 *   modulesDir: 'src/modules',           // optional, defaults to "src/modules"
 *   activeModules: ['user', 'billing'],
 *   command: process.env.MIGRATION_CMD ?? 'up',
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

    // Close pool if opened
    if (result.pool) {
      await result.pool.end();
    }

    process.exit(result.exitCode);
  } catch (error) {
    console.error("");
    log(
      "error",
      `Unexpected error: ${error instanceof Error ? error.message : error}`,
    );
    console.error("");
    process.exit(1);
  }
}
