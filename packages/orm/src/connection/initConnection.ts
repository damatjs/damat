import { Options } from "@damatjs/deps/mikro-orm/postgresql";
import type { DatabaseConnection, OrmConfig } from "../types";
import { connectionInstance, setConnectionInstance } from "./singleton";
import {
  createConnection,
  createConnectionFromOptions,
} from "./createConnection";

/**
 * Initialize the singleton database connection.
 *
 * @param config - ORM configuration (only used on first call)
 * @returns Database connection instance
 *
 * @example
 * ```typescript
 * import { initConnection, getConnection } from '@damatjs/utils/dal';
 *
 * // Initialize once at startup
 * await initConnection({
 *   database: { url: process.env.DATABASE_URL },
 *   modules: [userModule, billingModule],
 * });
 *
 * // Use anywhere in application
 * const connection = getConnection();
 * const users = await connection.em.find(User, {});
 * ```
 */
export async function initConnection(
  config: OrmConfig,
): Promise<DatabaseConnection> {
  if (!connectionInstance) {
    setConnectionInstance(await createConnection(config));
  }
  return connectionInstance!;
}

/**
 * Initialize connection from raw MikroORM options.
 *
 * @param options - MikroORM Options
 * @returns Database connection instance
 */
export async function initConnectionFromOptions(
  options: Options,
): Promise<DatabaseConnection> {
  if (!connectionInstance) {
    setConnectionInstance(await createConnectionFromOptions(options));
  }
  return connectionInstance!;
}
