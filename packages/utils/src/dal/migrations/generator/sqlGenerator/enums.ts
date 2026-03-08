// /**
//  * Enum SQL Generation
//  *
//  * Generate SQL statements for enum type operations.
//  */

// import type {
//   AlterEnumChange,
//   CreateEnumChange,
//   DropEnumChange,
//   MigrationGeneratorOptions,
// } from "../types";
// import { quoteIdentifier } from "./utils";

// /**
//  * Generate CREATE TYPE (enum) SQL
//  */
// export function generateCreateEnum(
//   change: CreateEnumChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const { enumDef } = change;
//   const enumName = quoteIdentifier(enumDef.name);
//   const values = enumDef.values
//     .map((v: string) => `'${v.replace(/'/g, "''")}'`)
//     .join(", ");

//   // PostgreSQL doesn't have IF NOT EXISTS for CREATE TYPE, so we'll use DO block
//   if (options.safeMode !== false) {
//     return `DO $$ BEGIN
//     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumDef.name}') THEN
//         CREATE TYPE ${enumName} AS ENUM (${values});
//     END IF;
// END $$`;
//   }

//   return `CREATE TYPE ${enumName} AS ENUM (${values})`;
// }

// /**
//  * Generate DROP TYPE (enum) SQL
//  */
// export function generateDropEnum(
//   change: DropEnumChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const enumName = quoteIdentifier(change.enumName);

//   let sql = `DROP TYPE`;
//   if (options.safeMode !== false) {
//     sql += ` IF EXISTS`;
//   }
//   sql += ` ${enumName}`;
//   if (options.cascadeDrops) {
//     sql += ` CASCADE`;
//   }

//   return sql;
// }

// /**
//  * Generate ALTER TYPE (enum) SQL - adding values
//  * Note: PostgreSQL doesn't support removing enum values directly
//  */
// export function generateAlterEnum(
//   change: AlterEnumChange,
//   _options: MigrationGeneratorOptions,
// ): string[] {
//   const statements: string[] = [];
//   const enumName = quoteIdentifier(change.enumName);

//   // Add new values
//   if (change.addValues) {
//     for (const value of change.addValues) {
//       const escapedValue = value.replace(/'/g, "''");
//       statements.push(
//         `ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS '${escapedValue}'`,
//       );
//     }
//   }

//   // Note: Removing values is complex in PostgreSQL
//   // We'd need to: create new type, update columns, drop old type, rename new type
//   // This is left as a warning in the diff phase

//   return statements;
// }
