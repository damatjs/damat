import "reflect-metadata";
import {
  Options,
  PostgreSqlDriver,
} from "@damatjs/deps/mikro-orm/postgresql";
import { TsMorphMetadataProvider } from "@damatjs/deps/mikro-orm/reflection";
import type { DatabaseConfig, OrmConfig } from "../types";
import { collectEntities } from "./collectEntities";
import { extractDbName } from "./extractDbName";
import type { EntityClass } from "../types";

/**
 * Default database configuration values
 */
const DEFAULT_DATABASE_CONFIG: Partial<DatabaseConfig> = {
  debug: process.env.NODE_ENV === "development",
  poolMin: 2,
  poolMax: 10,
  allowGlobalContext: true,
};

/**
 * Create MikroORM configuration from database config.
 *
 * @param config - ORM configuration options
 * @returns MikroORM Options object
 *
 * @example
 * ```typescript
 * import { createOrmConfig } from '@damatjs/utils/dal';
 *
 * const config = createOrmConfig({
 *   database: { url: process.env.DATABASE_URL },
 *   modules: [
 *     { name: 'user', entities: [User, Account, Session] },
 *     { name: 'billing', entities: [Invoice, Subscription] },
 *   ],
 * });
 *
 * const orm = await MikroORM.init(config);
 * ```
 */
export function createOrmConfig(config: OrmConfig): Options {
  const dbConfig: DatabaseConfig = {
    ...DEFAULT_DATABASE_CONFIG,
    ...config.database,
  };

  // Collect entities from modules
  const entities = config.modules ? collectEntities(config.modules) : [];

  return {
    driver: PostgreSqlDriver,
    clientUrl: dbConfig.url,
    dbName: dbConfig.dbName ?? extractDbName(dbConfig.url),

    // Entities from modules
    entities,

    // Metadata provider for better type inference
    metadataProvider: TsMorphMetadataProvider,

    // Debug mode
    debug: dbConfig.debug ?? false,

    // Schema management
    allowGlobalContext: dbConfig.allowGlobalContext ?? true,

    // Connection pool
    pool: {
      min: dbConfig.poolMin ?? 2,
      max: dbConfig.poolMax ?? 10,
    },

    // Merge additional options
    ...config.options,
  };
}


/**
 * Create MikroORM configuration with simplified API.
 *
 * @param databaseUrl - PostgreSQL connection URL
 * @param entities - Array of entity classes
 * @param extraOptions - Additional MikroORM options
 * @returns MikroORM Options object
 *
 * @example
 * ```typescript
 * import { createSimpleOrmConfig } from '@damatjs/utils/dal';
 *
 * const config = createSimpleOrmConfig(
 *   process.env.DATABASE_URL,
 *   [User, Team, Project],
 * );
 * ```
 */
export function createSimpleOrmConfig(
  databaseUrl: string,
  entities: EntityClass<any>[] = [],
  extraOptions: Partial<Options> = {},
): Options {
  return createOrmConfig({
    database: { url: databaseUrl },
    modules: [{ name: "_default", entities }],
    options: extraOptions,
  });
}

/**
 * @deprecated Use createSimpleOrmConfig instead
 */
export function createMikroOrmConfig(
  entities: EntityClass<any>[] = [],
  extraOptions: Partial<Options> = {},
): Options {
  return createSimpleOrmConfig(
    process.env.DATABASE_URL as string,
    entities,
    extraOptions,
  );
}
