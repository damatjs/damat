// /**
//  * Index SQL Generation
//  *
//  * Generate SQL statements for index operations.
//  */

// import type {
//   AddIndexChange,
//   DropIndexChange,
//   MigrationGeneratorOptions,
// } from "../types";
// import { quoteIdentifier } from "./utils";

// /**
//  * Generate CREATE INDEX SQL
//  */
// export function generateCreateIndex(
//   index: {
//     name: string;
//     columns: string[];
//     unique: boolean;
//     type?: string | undefined;
//     where?: string | undefined;
//   },
//   tableName: string,
//   schema: string,
//   options: MigrationGeneratorOptions,
// ): string {
//   const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;
//   const indexName = quoteIdentifier(index.name);
//   const columns = index.columns.map(quoteIdentifier).join(", ");

//   let sql = `CREATE`;
//   if (index.unique) {
//     sql += ` UNIQUE`;
//   }
//   sql += ` INDEX`;
//   if (options.safeMode !== false) {
//     sql += ` IF NOT EXISTS`;
//   }
//   sql += ` ${indexName} ON ${fullTableName}`;

//   if (index.type && index.type !== "btree") {
//     sql += ` USING ${index.type}`;
//   }

//   sql += ` (${columns})`;

//   if (index.where) {
//     sql += ` WHERE ${index.where}`;
//   }

//   return sql;
// }

// /**
//  * Generate ADD INDEX SQL from change
//  */
// export function generateAddIndex(
//   change: AddIndexChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const schema = options.schema || "public";
//   return generateCreateIndex(change.index, change.tableName, schema, options);
// }

// /**
//  * Generate DROP INDEX SQL
//  */
// export function generateDropIndex(
//   change: DropIndexChange,
//   options: MigrationGeneratorOptions,
// ): string {
//   const schema = options.schema || "public";
//   const fullIndexName = `${quoteIdentifier(schema)}.${quoteIdentifier(change.indexName)}`;

//   let sql = `DROP INDEX`;
//   if (options.safeMode !== false) {
//     sql += ` IF EXISTS`;
//   }
//   sql += ` ${fullIndexName}`;

//   return sql;
// }
