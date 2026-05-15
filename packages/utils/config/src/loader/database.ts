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
  createOrmConfig,
} from "@damatjs/orm-connector";

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
  const dbModules = modules.map((mod) => ({
    name: mod.name,
    entities: extractEntities(mod),
    migrationsPath: mod.migrationsPath,
  }));

  // Create ORM config
  const ormConfig = createOrmConfig({
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

