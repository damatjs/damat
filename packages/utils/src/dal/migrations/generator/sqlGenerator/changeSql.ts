// /**
//  * Change SQL Generation
//  *
//  * Generate SQL statements for schema changes and descriptions.
//  */

// import type {
//   MigrationGeneratorOptions,
//   SchemaChange,
//   SchemaDiff,
// } from "../types";
// import {
//   generateCreateTable,
//   generateDropTable,
//   generateRenameTable,
// } from "./tables";
// import {
//   generateAddColumn,
//   generateDropColumn,
//   generateAlterColumn,
//   generateRenameColumn,
// } from "./columns";
// import { generateAddIndex, generateDropIndex } from "./indexes";
// import {
//   generateAddForeignKeyFromChange,
//   generateDropForeignKey,
// } from "./foreignKeys";
// import {
//   generateCreateEnum,
//   generateDropEnum,
//   generateAlterEnum,
// } from "./enums";

// /**
//  * Generate SQL statements for a single schema change
//  */
// export function generateChangeSQL(
//   change: SchemaChange,
//   options: MigrationGeneratorOptions,
// ): string[] {
//   switch (change.type) {
//     case "create_table":
//       return generateCreateTable(change, options);

//     case "drop_table":
//       return [generateDropTable(change, options)];

//     case "rename_table":
//       return [generateRenameTable(change, options)];

//     case "add_column":
//       return [generateAddColumn(change, options)];

//     case "drop_column":
//       return [generateDropColumn(change, options)];

//     case "alter_column":
//       return generateAlterColumn(change, options);

//     case "rename_column":
//       return [generateRenameColumn(change, options)];

//     case "add_index":
//       return [generateAddIndex(change, options)];

//     case "drop_index":
//       return [generateDropIndex(change, options)];

//     case "add_foreign_key":
//       return [generateAddForeignKeyFromChange(change, options)];

//     case "drop_foreign_key":
//       return [generateDropForeignKey(change, options)];

//     case "create_enum":
//       return [generateCreateEnum(change, options)];

//     case "drop_enum":
//       return [generateDropEnum(change, options)];

//     case "alter_enum":
//       return generateAlterEnum(change, options);

//     default:
//       return [];
//   }
// }

// /**
//  * Generate a description of the changes for comments
//  */
// export function generateDescription(diff: SchemaDiff): string {
//   const counts: Record<string, number> = {};

//   for (const change of diff.changes) {
//     counts[change.type] = (counts[change.type] || 0) + 1;
//   }

//   const parts: string[] = [];

//   if (counts["create_table"]) {
//     parts.push(`${counts["create_table"]} table(s) created`);
//   }
//   if (counts["drop_table"]) {
//     parts.push(`${counts["drop_table"]} table(s) dropped`);
//   }
//   if (counts["add_column"]) {
//     parts.push(`${counts["add_column"]} column(s) added`);
//   }
//   if (counts["drop_column"]) {
//     parts.push(`${counts["drop_column"]} column(s) dropped`);
//   }
//   if (counts["alter_column"]) {
//     parts.push(`${counts["alter_column"]} column(s) altered`);
//   }
//   if (counts["add_index"]) {
//     parts.push(`${counts["add_index"]} index(es) added`);
//   }
//   if (counts["drop_index"]) {
//     parts.push(`${counts["drop_index"]} index(es) dropped`);
//   }
//   if (counts["add_foreign_key"]) {
//     parts.push(`${counts["add_foreign_key"]} foreign key(s) added`);
//   }
//   if (counts["drop_foreign_key"]) {
//     parts.push(`${counts["drop_foreign_key"]} foreign key(s) dropped`);
//   }
//   if (counts["create_enum"]) {
//     parts.push(`${counts["create_enum"]} enum(s) created`);
//   }
//   if (counts["alter_enum"]) {
//     parts.push(`${counts["alter_enum"]} enum(s) altered`);
//   }

//   return parts.join(", ") || "No changes";
// }
