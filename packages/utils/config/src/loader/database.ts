/**
 * Config Module - Config Loader
 *
 * Configuration loader with database and module initialization.
 */

import { Migrator } from "@damatjs/deps/mikro-orm/migrations";
import type {
  MikroORM,
  Options,
} from "@damatjs/deps/mikro-orm/postgresql";
import {
  initConnectionFromOptions,
  getEm as dalGetEm,
  closeConnection,
  createOrmConfig,
  type DatabaseModule,
} from "@damatjs/orm-connector";

// Database config
let ormConfig: Options | null = null;
let dbModules: DatabaseModule[] = [];


/**
 * Extract entities from a module's service.
 * The service.entities is a Record<string, EntityClass>.
 */
function extractEntities(mod: any): any[] {
  const extraction = new mod.moduleService();
  if (extraction.entities) {
    return Object.values(extraction.entities);
  }
  return [];
}

/**
 * Initialize the database and all service modules.
 * Call this during app startup.
 *
 * @param options - Additional MikroORM options (like extensions)
 * @returns MikroORM instance
 */
export async function initDatabase<TModules extends readonly any[]>(
  { databaseUrl, modules, options }: {
    options?: Partial<Options>,
    databaseUrl: string,
    modules: TModules
  }
): Promise<MikroORM> {


  // Build database modules from service modules
  dbModules = modules.map((mod) => ({
    name: mod.name,
    entities: extractEntities(mod),
    migrationsPath: mod.migrationsPath,
  }));

  // Create ORM config
  ormConfig = createOrmConfig({
    database: { url: databaseUrl },
    modules: dbModules,
    options: options ?? {
      extensions: [Migrator],
    }
  });

  // Initialize connection
  const connection = await initConnectionFromOptions(ormConfig);

  // Initialize all service modules with em factory
  for (const mod of modules) {
    mod.init(() => dalGetEm());
  }

  return connection.orm;
}

/**
 * Close the database connection.
 */
export async function disconnectDatabase(): Promise<void> {
  await closeConnection();
}

/**
 * Get the database modules.
 */
export function getDbModules(): DatabaseModule[] {
  return dbModules;
}

/**
 * Get the ORM config.
 */
export function getOrmConfig(): Options | null {
  return ormConfig;
}

/**
 * Get all entities from all modules.
 */
export function getAllEntities(): any[] {
  return dbModules.flatMap((m) => m.entities);
}
