// /**
//  * Schema Snapshot Utilities
//  *
//  * Utility functions for working with schema snapshots and previewing migrations.
//  */

// import fs from "node:fs";
// import path from "node:path";
// import type {
//   MikroORM,
//   EntityClass,
// } from "@damatjs/deps/mikro-orm/postgresql";

// import { log } from "../../logger";
// import { extractModuleSchema } from "../introspection";
// import { diffSchemas } from "../diff";
// import { generateMigrationSQL } from "../sqlGenerator";
// import { loadPreviousSchema, saveSchemaSnapshot } from ".";
// import type {
//   TableSchema,
//   EnumSchema,
//   SchemaDiff,
//   GeneratedMigration,
// } from "../types";

// /**
//  * Update the schema snapshot for a module without creating a migration.
//  * Useful for syncing the snapshot with the current database state.
//  *
//  * @param modulesDir - Path to the modules directory
//  * @param moduleName - Name of the module
//  * @param entities - Entity classes for the module
//  * @param orm - MikroORM instance
//  */
// export function updateSchemaSnapshot(
//   modulesDir: string,
//   moduleName: string,
//   entities: EntityClass<unknown>[],
//   orm: MikroORM,
// ): void {
//   const moduleDir = path.join(modulesDir, moduleName);
//   const migrationsDir = path.join(moduleDir, "migrations");

//   if (!fs.existsSync(migrationsDir)) {
//     fs.mkdirSync(migrationsDir, { recursive: true });
//   }

//   const schema = extractModuleSchema(moduleName, entities, orm);
//   saveSchemaSnapshot(migrationsDir, schema.tables, schema.enums);
//   log("success", `Updated schema snapshot for ${moduleName}`);
// }

// /**
//  * Get the current schema snapshot for a module
//  *
//  * @param modulesDir - Path to the modules directory
//  * @param moduleName - Name of the module
//  * @returns The stored schema or empty arrays if none exists
//  */
// export function getSchemaSnapshot(
//   modulesDir: string,
//   moduleName: string,
// ): { tables: TableSchema[]; enums: EnumSchema[] } {
//   const migrationsDir = path.join(modulesDir, moduleName, "migrations");
//   return loadPreviousSchema(migrationsDir);
// }

// /**
//  * Preview what changes would be in a diff migration without creating it
//  *
//  * @param modulesDir - Path to the modules directory
//  * @param moduleName - Name of the module
//  * @param entities - Entity classes for the module
//  * @param orm - MikroORM instance
//  * @returns Preview of the diff and generated SQL
//  */
// export function previewDiffMigration(
//   modulesDir: string,
//   moduleName: string,
//   entities: EntityClass<unknown>[],
//   orm: MikroORM,
// ): { diff: SchemaDiff; migration: GeneratedMigration } {
//   const migrationsDir = path.join(modulesDir, moduleName, "migrations");

//   // Extract current schema
//   const currentSchema = extractModuleSchema(moduleName, entities, orm);

//   // Load previous schema
//   const previousSchema = loadPreviousSchema(migrationsDir);

//   // Generate diff
//   const diff = diffSchemas(
//     previousSchema.tables,
//     currentSchema.tables,
//     previousSchema.enums,
//     currentSchema.enums,
//   );

//   // Generate migration SQL
//   const migration = generateMigrationSQL(diff);

//   return { diff, migration };
// }
