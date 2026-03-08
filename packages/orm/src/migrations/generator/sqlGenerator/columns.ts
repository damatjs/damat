// /**
//  * Column SQL Generation
//  *
//  * Generate SQL statements for column operations.
//  */

// import type {
//   AddColumnChange,
//   AlterColumnChange,
//   DropColumnChange,
//   RenameColumnChange,
//   MigrationGeneratorOptions,
// } from "../types";
// import { quoteIdentifier, generateColumnDefinition } from "./utils";

// /**
//  * Generate ADD COLUMN SQL
//  */
// export function generateAddColumn(
//   change: AddColumnChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const { tableName, column } = change;
//   const schema = options.schema || "public";
//   const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;

//   const columnDef = generateColumnDefinition(column);

//   return `ALTER TABLE ${fullTableName} ADD COLUMN ${columnDef}`;
// }

// /**
//  * Generate DROP COLUMN SQL
//  */
// export function generateDropColumn(
//   change: DropColumnChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const { tableName, columnName } = change;
//   const schema = options.schema || "public";
//   const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;

//   let sql = `ALTER TABLE ${fullTableName} DROP COLUMN`;
//   if (options.safeMode !== false) {
//     sql += ` IF EXISTS`;
//   }
//   sql += ` ${quoteIdentifier(columnName)}`;
//   if (options.cascadeDrops) {
//     sql += ` CASCADE`;
//   }

//   return sql;
// }

// /**
//  * Generate ALTER COLUMN SQL (may produce multiple statements)
//  */
// export function generateAlterColumn(
//   change: AlterColumnChange,
//   options: MigrationGeneratorOptions,
// ): string[] {
//   const { tableName, columnName, changes } = change;
//   const schema = options.schema || "public";
//   const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;
//   const quotedColumn = quoteIdentifier(columnName);

//   const statements: string[] = [];

//   // Type change
//   if (changes.type) {
//     const newType = changes.type.to.toUpperCase();
//     statements.push(
//       `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} TYPE ${newType} USING ${quotedColumn}::${newType}`,
//     );
//   }

//   // Nullable change
//   if (changes.nullable) {
//     if (changes.nullable.to) {
//       statements.push(
//         `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} DROP NOT NULL`,
//       );
//     } else {
//       statements.push(
//         `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} SET NOT NULL`,
//       );
//     }
//   }

//   // Default change
//   if (changes.default !== undefined) {
//     if (changes.default.to) {
//       statements.push(
//         `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} SET DEFAULT ${changes.default.to}`,
//       );
//     } else {
//       statements.push(
//         `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} DROP DEFAULT`,
//       );
//     }
//   }

//   // Length change (requires type change for varchar)
//   if (changes.length && !changes.type) {
//     // For varchar, we need to alter the type with new length
//     const newLength = changes.length.to;
//     if (newLength) {
//       statements.push(
//         `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} TYPE VARCHAR(${newLength})`,
//       );
//     }
//   }

//   return statements;
// }

// /**
//  * Generate RENAME COLUMN SQL
//  */
// export function generateRenameColumn(
//   change: RenameColumnChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const { tableName, oldName, newName } = change;
//   const schema = options.schema || "public";
//   const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;

//   return `ALTER TABLE ${fullTableName} RENAME COLUMN ${quoteIdentifier(oldName)} TO ${quoteIdentifier(newName)}`;
// }
