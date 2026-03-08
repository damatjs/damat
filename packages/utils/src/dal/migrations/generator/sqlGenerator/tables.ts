// /**
//  * Table SQL Generation
//  *
//  * Generate SQL statements for table operations.
//  */

// import type {
//   CreateTableChange,
//   DropTableChange,
//   RenameTableChange,
//   MigrationGeneratorOptions,
// } from "../types";
// import { quoteIdentifier, generateColumnDefinition } from "./utils";
// import { generateCreateIndex } from "./indexes";
// import { generateAddForeignKey } from "./foreignKeys";

// /**
//  * Generate CREATE TABLE SQL
//  */
// export function generateCreateTable(
//   change: CreateTableChange,
//   options: MigrationGeneratorOptions,
// ): string[] {
//   const { table } = change;
//   const statements: string[] = [];

//   const schema = options.schema || table.schema || "public";
//   const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(table.name)}`;

//   // Generate column definitions
//   const columnDefs = table.columns.map(generateColumnDefinition);

//   // Create the table
//   let createSql = `CREATE TABLE`;
//   if (options.safeMode !== false) {
//     createSql += ` IF NOT EXISTS`;
//   }
//   createSql += ` ${fullTableName} (\n    ${columnDefs.join(",\n    ")}\n)`;

//   statements.push(createSql);

//   // Generate indexes (excluding primary key which is inline)
//   for (const index of table.indexes) {
//     // Skip primary key index as it's defined inline
//     if (
//       table.primaryKey.length > 0 &&
//       index.columns.length === table.primaryKey.length &&
//       index.columns.every((c: string) => table.primaryKey.includes(c))
//     ) {
//       continue;
//     }

//     const indexSql = generateCreateIndex(index, table.name, schema, options);
//     statements.push(indexSql);
//   }

//   // Generate foreign keys
//   for (const fk of table.foreignKeys) {
//     const fkSql = generateAddForeignKey(fk, table.name, schema);
//     statements.push(fkSql);
//   }

//   return statements;
// }

// /**
//  * Generate DROP TABLE SQL
//  */
// export function generateDropTable(
//   change: DropTableChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const schema = options.schema || "public";
//   const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(change.tableName)}`;

//   let sql = `DROP TABLE`;
//   if (options.safeMode !== false) {
//     sql += ` IF EXISTS`;
//   }
//   sql += ` ${fullTableName}`;
//   if (change.cascade || options.cascadeDrops) {
//     sql += ` CASCADE`;
//   }

//   return sql;
// }

// /**
//  * Generate RENAME TABLE SQL (ALTER TABLE ... RENAME TO)
//  */
// export function generateRenameTable(
//   change: RenameTableChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const schema = options.schema || "public";
//   const oldFullName = `${quoteIdentifier(schema)}.${quoteIdentifier(change.oldName)}`;
//   const newName = quoteIdentifier(change.newName);

//   return `ALTER TABLE ${oldFullName} RENAME TO ${newName}`;
// }
