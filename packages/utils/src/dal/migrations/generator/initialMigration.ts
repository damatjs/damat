// /**
//  * Initial Migration Creation
//  *
//  * Creates initial migrations that set up all tables for a module.
//  * Useful for new modules or baseline migrations.
//  */

// import fs from "node:fs";
// import path from "node:path";
// import type {
//   MikroORM,
//   EntityClass,
// } from "@damatjs/deps/mikro-orm/postgresql";

// import { log } from "../logger";
// import { getInitialMigrationTemplate } from "./utils/template";
// import { generateTimestamp } from "./utils/timestamp";
// import { extractModuleSchema } from "./introspection";
// import { generateCreateTableSQL, generateDropTableSQL } from "./sqlGenerator";
// import { saveSchemaSnapshot } from "./snapshot";
// import type { MigrationGeneratorOptions } from "./types";

// /**
//  * Create an initial migration that creates all tables for a module.
//  * Useful for setting up a new module or creating a baseline migration.
//  *
//  * @param modulesDir - Path to the modules directory
//  * @param moduleName - Name of the module
//  * @param entities - Entity classes for the module
//  * @param orm - MikroORM instance for metadata extraction
//  * @param options - Generation options
//  * @returns Path to the created migration file
//  *
//  * @example
//  * ```typescript
//  * const filePath = createInitialMigration(
//  *   './src/modules',
//  *   'user',
//  *   [User, UserProfile],
//  *   orm,
//  * );
//  * ```
//  */
// export function createInitialMigration(
//   modulesDir: string,
//   moduleName: string,
//   entities: EntityClass<unknown>[],
//   orm: MikroORM,
//   options: MigrationGeneratorOptions = {},
// ): string {
//   const moduleDir = path.join(modulesDir, moduleName);
//   const migrationsDir = path.join(moduleDir, "migrations");

//   if (!fs.existsSync(moduleDir)) {
//     throw new Error(`Module '${moduleName}' not found at ${moduleDir}`);
//   }

//   if (!fs.existsSync(migrationsDir)) {
//     fs.mkdirSync(migrationsDir, { recursive: true });
//   }

//   // Extract schema from entities
//   const schema = extractModuleSchema(moduleName, entities, orm);

//   // Generate SQL for all tables
//   const upStatements: string[] = [];
//   const downStatements: string[] = [];

//   for (const table of schema.tables) {
//     const createStatements = generateCreateTableSQL(table, options);
//     upStatements.push(...createStatements);

//     const dropStatement = generateDropTableSQL(table.name, options);
//     downStatements.unshift(dropStatement); // Reverse order for down
//   }

//   // Create migration file
//   const now = new Date();
//   const timestamp = generateTimestamp(now);
//   const className = `Migration${timestamp}_Initial`;
//   const filename = `${className}.ts`;
//   const filePath = path.join(migrationsDir, filename);

//   const template = getInitialMigrationTemplate(
//     className,
//     "Initial",
//     moduleName,
//     now,
//     upStatements,
//     downStatements,
//   );

//   fs.writeFileSync(filePath, template);
//   log("success", `Created initial migration: ${moduleName}/${filename}`);

//   // Save initial schema snapshot
//   saveSchemaSnapshot(migrationsDir, schema.tables, schema.enums);
//   log("info", `Created schema snapshot for ${moduleName}`);

//   return filePath;
// }
