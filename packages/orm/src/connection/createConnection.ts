import { MikroORM, Options } from "@damatjs/deps/mikro-orm/postgresql";
import type { DatabaseConnection, OrmConfig } from "../types";
import { createOrmConfig } from "../config";
import { wrapOrmConnection } from "./wrapOrmConnection";

/**
 * Create a new database connection from ORM config.
 *
 * @param config - ORM configuration
 * @returns Database connection instance
 *
 * @example
 * ```typescript
 * import { createConnection } from '@damatjs/utils/dal';
 *
 * const connection = await createConnection({
 *   database: { url: process.env.DATABASE_URL },
 *   modules: [userModule, billingModule],
 * });
 *
 * const users = await connection.em.find(User, {});
 * await connection.close();
 * ```
 */
export async function createConnection(
  config: OrmConfig,
): Promise<DatabaseConnection> {
  const ormConfig = createOrmConfig(config);
  const orm = await MikroORM.init(ormConfig);
  return wrapOrmConnection(orm);
}

/**
 * Create a connection from raw MikroORM options.
 *
 * @param options - MikroORM Options
 * @returns Database connection instance
 */
export async function createConnectionFromOptions(
  options: Options,
): Promise<DatabaseConnection> {
  const orm = await MikroORM.init(options);
  return wrapOrmConnection(orm);
}
