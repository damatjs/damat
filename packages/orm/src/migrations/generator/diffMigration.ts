// /**
//  * Diff-Based Migration Creation
//  *
//  * Creates migrations based on the difference between current entities
//  * and the previous schema snapshot.
//  */

// import fs from "node:fs";
// import path from "node:path";
// import type {
//   MikroORM,
//   EntityClass,
// } from "@damatjs/deps/mikro-orm/postgresql";

// import { log } from "../logger";
// import { getMigrationTemplateWithSQL } from "./utils/template";
// import { generateTimestamp } from "./utils/timestamp";
// import { extractModuleSchema } from "./introspection";
// import { diffSchemas } from "./diff";
// import { generateMigrationSQL } from "./sqlGenerator";
// import { loadPreviousSchema, saveSchemaSnapshot } from "./snapshot";
// import type {
//   CreateDiffMigrationOptions,
//   DiffMigrationResult,
// } from "./types";

// /**
//  * Create a migration based on the difference between current entities
//  * and the previous schema snapshot.
//  *
//  * @param modulesDir - Path to the modules directory
//  * @param moduleName - Name of the module
//  * @param name - Name for the migration
//  * @param entities - Current entity classes for the module
//  * @param orm - MikroORM instance for metadata extraction
//  * @param options - Generation options
//  * @returns Result with path and diff information
//  *
//  * @example
//  * ```typescript
//  * const result = await createDiffMigration(
//  *   './src/modules',
//  *   'user',
//  *   'AddPhoneColumn',
//  *   [User, UserProfile],
//  *   orm,
//  * );
//  *
//  * if (result.hasChanges) {
//  *   console.log(`Migration created: ${result.filePath}`);
//  * } else {
//  *   console.log('No changes detected');
//  * }
//  * ```
//  */
// export function createDiffMigration(
//   modulesDir: string,
//   moduleName: string,
//   name: string,
//   entities: EntityClass<unknown>[],
//   orm: MikroORM,
//   options: CreateDiffMigrationOptions = {},
// ): DiffMigrationResult {
//   const moduleDir = path.join(modulesDir, moduleName);
//   const migrationsDir = path.join(moduleDir, "migrations");

//   if (!fs.existsSync(moduleDir)) {
//     throw new Error(`Module '${moduleName}' not found at ${moduleDir}`);
//   }

//   if (!fs.existsSync(migrationsDir)) {
//     fs.mkdirSync(migrationsDir, { recursive: true });
//   }

//   // Extract current schema from entities
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

//   // If no changes and not forcing, return early
//   if (!diff.hasChanges && !options.force) {
//     return {
//       filePath: null,
//       hasChanges: false,
//       diff,
//       migration: null,
//       warnings: [],
//     };
//   }

//   // Generate migration SQL
//   const migration = generateMigrationSQL(diff, options);

//   // Create migration file
//   const now = new Date();
//   const timestamp = generateTimestamp(now);
//   const className = `Migration${timestamp}_${name}`;
//   const filename = `${className}.ts`;
//   const filePath = path.join(migrationsDir, filename);

//   const template = getMigrationTemplateWithSQL(
//     className,
//     name,
//     moduleName,
//     now,
//     migration,
//   );

//   fs.writeFileSync(filePath, template);
//   log("success", `Created migration: ${moduleName}/${filename}`);

//   // Update snapshot if requested
//   if (options.updateSnapshot !== false) {
//     saveSchemaSnapshot(
//       migrationsDir,
//       currentSchema.tables,
//       currentSchema.enums,
//     );
//     log("info", `Updated schema snapshot for ${moduleName}`);
//   }

//   // Log warnings
//   if (migration.warnings.length > 0) {
//     for (const warning of migration.warnings) {
//       log("warn", warning);
//     }
//   }

//   return {
//     filePath,
//     hasChanges: diff.hasChanges,
//     diff,
//     migration,
//     warnings: migration.warnings,
//   };
// }
