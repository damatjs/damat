// /**
//  * Reverse SQL Generation
//  *
//  * Generate reverse SQL statements for down migrations.
//  */

// import type {
//   AlterColumnChange,
//   MigrationGeneratorOptions,
//   SchemaChange,
// } from "../types";
// import { generateDropTable } from "./tables";
// import {
//   generateDropColumn,
//   generateAlterColumn,
//   generateRenameColumn,
// } from "./columns";
// import { generateDropIndex } from "./indexes";
// import { generateDropForeignKey } from "./foreignKeys";
// import { generateDropEnum } from "./enums";

// /**
//  * Generate reverse SQL for a change (for down migration)
//  */
// export function generateReverseChangeSQL(
//   change: SchemaChange,
//   options: MigrationGeneratorOptions,
// ): string[] {
//   switch (change.type) {
//     case "create_table":
//       return [
//         generateDropTable(
//           {
//             type: "drop_table",
//             tableName: change.table.name,
//             cascade: true,
//             priority: 0,
//           },
//           options,
//         ),
//       ];

//     case "drop_table":
//       // Can't reverse without original table schema
//       // The caller should store original schemas for full reversibility
//       return [`-- Cannot automatically reverse DROP TABLE ${change.tableName}`];

//     case "add_column":
//       return [
//         generateDropColumn(
//           {
//             type: "drop_column",
//             tableName: change.tableName,
//             columnName: change.column.name,
//             priority: 0,
//           },
//           options,
//         ),
//       ];

//     case "drop_column":
//       return [
//         `-- Cannot automatically reverse DROP COLUMN ${change.columnName} from ${change.tableName}`,
//       ];

//     case "alter_column": {
//       // Reverse the alterations
//       const reverseChanges: AlterColumnChange["changes"] = {};

//       if (change.changes.type) {
//         reverseChanges.type = {
//           from: change.changes.type.to,
//           to: change.changes.type.from,
//         };
//       }
//       if (change.changes.nullable) {
//         reverseChanges.nullable = {
//           from: change.changes.nullable.to,
//           to: change.changes.nullable.from,
//         };
//       }
//       if (change.changes.default !== undefined) {
//         reverseChanges.default = {
//           from: change.changes.default.to,
//           to: change.changes.default.from,
//         };
//       }
//       if (change.changes.length) {
//         reverseChanges.length = {
//           from: change.changes.length.to,
//           to: change.changes.length.from,
//         };
//       }

//       return generateAlterColumn(
//         { ...change, changes: reverseChanges },
//         options,
//       );
//     }

//     case "rename_column":
//       return [
//         generateRenameColumn(
//           { ...change, oldName: change.newName, newName: change.oldName },
//           options,
//         ),
//       ];

//     case "add_index":
//       return [
//         generateDropIndex(
//           {
//             type: "drop_index",
//             tableName: change.tableName,
//             indexName: change.index.name,
//             priority: 0,
//           },
//           options,
//         ),
//       ];

//     case "drop_index":
//       return [`-- Cannot automatically reverse DROP INDEX ${change.indexName}`];

//     case "add_foreign_key":
//       return [
//         generateDropForeignKey(
//           {
//             type: "drop_foreign_key",
//             tableName: change.tableName,
//             constraintName: change.foreignKey.name,
//             priority: 0,
//           },
//           options,
//         ),
//       ];

//     case "drop_foreign_key":
//       return [
//         `-- Cannot automatically reverse DROP CONSTRAINT ${change.constraintName}`,
//       ];

//     case "create_enum":
//       return [
//         generateDropEnum(
//           { type: "drop_enum", enumName: change.enumDef.name, priority: 0 },
//           options,
//         ),
//       ];

//     case "drop_enum":
//       return [`-- Cannot automatically reverse DROP TYPE ${change.enumName}`];

//     case "alter_enum":
//       // Enum alterations for added values can't be easily reversed in PostgreSQL
//       if (change.addValues?.length) {
//         return [
//           `-- Cannot automatically reverse ALTER TYPE ${change.enumName} (added values: ${change.addValues.join(", ")})`,
//         ];
//       }
//       return [];

//     default:
//       return [];
//   }
// }
