// /**
//  * Migration Generation
//  *
//  * Public API for generating migration SQL from schema diffs.
//  */

// import type {
//   GeneratedMigration,
//   MigrationGeneratorOptions,
//   SchemaDiff,
//   TableSchema,
// } from "../types";
// import { generateChangeSQL, generateDescription } from "./changeSql";
// import { generateReverseChangeSQL } from "./reverseSql";
// import { generateCreateTable, generateDropTable } from "./tables";

// /**
//  * Generate migration SQL from a schema diff
//  *
//  * @param diff - The schema diff containing changes
//  * @param options - Migration generation options
//  * @returns Generated migration with up/down SQL statements
//  */
// export function generateMigrationSQL(
//   diff: SchemaDiff,
//   options: MigrationGeneratorOptions = {},
// ): GeneratedMigration {
//   const defaultOptions: MigrationGeneratorOptions = {
//     generateDown: true,
//     cascadeDrops: false,
//     safeMode: true,
//     schema: "public",
//     reversible: true,
//     ...options,
//   };

//   const upStatements: string[] = [];
//   const downStatements: string[] = [];

//   // Generate UP statements
//   for (const change of diff.changes) {
//     const statements = generateChangeSQL(change, defaultOptions);
//     upStatements.push(...statements);
//   }

//   // Generate DOWN statements (reverse order, reverse operations)
//   if (defaultOptions.generateDown) {
//     // Process changes in reverse order
//     const reversedChanges = [...diff.changes].reverse();

//     for (const change of reversedChanges) {
//       const reverseStatements = generateReverseChangeSQL(
//         change,
//         defaultOptions,
//       );
//       downStatements.push(...reverseStatements);
//     }
//   }

//   return {
//     upStatements,
//     downStatements,
//     description: generateDescription(diff),
//     warnings: diff.warnings,
//   };
// }

// /**
//  * Generate SQL for creating a complete table from schema
//  * (Useful for generating initial/baseline migrations)
//  */
// export function generateCreateTableSQL(
//   table: TableSchema,
//   options: MigrationGeneratorOptions = {},
// ): string[] {
//   return generateCreateTable(
//     { type: "create_table", table, tableName: table.name, priority: 0 },
//     { safeMode: true, schema: "public", ...options },
//   );
// }

// /**
//  * Generate SQL for dropping a table
//  */
// export function generateDropTableSQL(
//   tableName: string,
//   options: MigrationGeneratorOptions = {},
// ): string {
//   return generateDropTable(
//     { type: "drop_table", tableName, cascade: true, priority: 0 },
//     { safeMode: true, schema: "public", ...options },
//   );
// }
