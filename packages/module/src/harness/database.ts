import { testPoolConfig } from "@damatjs/orm-connector";
import type { DbPoolConfigWithExtras } from "@damatjs/orm-type";
import type { BootModuleOptions } from "./types";

/**
 * Resolve the pool config for a harness boot:
 * explicit config > explicit databaseUrl > DATABASE_URL env var.
 */
export function resolveDatabaseConfig(
  options: BootModuleOptions,
): DbPoolConfigWithExtras {
  if (options.database) {
    return options.database;
  }

  const connectionString = options.databaseUrl ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "bootModule needs a database: set DATABASE_URL or pass { databaseUrl } / { database }",
    );
  }
  return { ...testPoolConfig(), connectionString };
}
