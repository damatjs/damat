// /**
//  * Foreign Key SQL Generation
//  *
//  * Generate SQL statements for foreign key operations.
//  */

// import type {
//   AddForeignKeyChange,
//   DropForeignKeyChange,
//   MigrationGeneratorOptions,
// } from "../types";
// import { quoteIdentifier } from "./utils";

// /**
//  * Generate ADD CONSTRAINT (foreign key) SQL
//  */
// export function generateAddForeignKey(
//   fk: {
//     name: string;
//     columns: string[];
//     referencedTable: string;
//     referencedColumns: string[];
//     onDelete?: string | undefined;
//     onUpdate?: string | undefined;
//   },
//   tableName: string,
//   schema: string,
// ): string {
//   const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;
//   const constraintName = quoteIdentifier(fk.name);
//   const columns = fk.columns.map(quoteIdentifier).join(", ");
//   const refTable = quoteIdentifier(fk.referencedTable);
//   const refColumns = fk.referencedColumns.map(quoteIdentifier).join(", ");

//   let sql = `ALTER TABLE ${fullTableName} ADD CONSTRAINT ${constraintName} `;
//   sql += `FOREIGN KEY (${columns}) REFERENCES ${refTable} (${refColumns})`;

//   if (fk.onDelete) {
//     sql += ` ON DELETE ${fk.onDelete}`;
//   }
//   if (fk.onUpdate) {
//     sql += ` ON UPDATE ${fk.onUpdate}`;
//   }

//   return sql;
// }

// /**
//  * Generate ADD FOREIGN KEY SQL from change
//  */
// export function generateAddForeignKeyFromChange(
//   change: AddForeignKeyChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const schema = options.schema || "public";
//   return generateAddForeignKey(change.foreignKey, change.tableName, schema);
// }

// /**
//  * Generate DROP CONSTRAINT (foreign key) SQL
//  */
// export function generateDropForeignKey(
//   change: DropForeignKeyChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const schema = options.schema || "public";
//   const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(change.tableName)}`;
//   const constraintName = quoteIdentifier(change.constraintName);

//   let sql = `ALTER TABLE ${fullTableName} DROP CONSTRAINT`;
//   if (options.safeMode !== false) {
//     sql += ` IF EXISTS`;
//   }
//   sql += ` ${constraintName}`;

//   return sql;
// }
