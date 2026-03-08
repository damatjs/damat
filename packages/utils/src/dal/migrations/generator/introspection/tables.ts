// /**
//  * Table Extraction
//  *
//  * Extract table schema from MikroORM entity metadata.
//  */

// import type { ColumnSchema, TableSchema } from "../types";
// import { isRelation } from "./typeMapping";
// import { extractColumn } from "./columns";
// import { extractIndexes } from "./indexes";
// import { extractForeignKeys } from "./foreignKeys";

// /**
//  * Extract table schema from entity metadata
//  */
// export function extractTableSchema(meta: Record<string, unknown>): TableSchema {
//   const columns: ColumnSchema[] = [];
//   const primaryKey: string[] = [];
//   const properties = meta.properties as Record<string, Record<string, unknown>>;

//   // Process all properties
//   for (const [, prop] of Object.entries(properties)) {
//     const refType = isRelation(prop);

//     // Skip relations that don't have actual columns (OneToMany, ManyToMany collections)
//     if (refType === "1:m" || refType === "m:n") {
//       continue;
//     }

//     // For ManyToOne/OneToOne, we might have a foreign key column
//     if (refType === "m:1" || refType === "1:1") {
//       const fieldNames = prop.fieldNames as string[] | undefined;
//       const fieldName = fieldNames?.[0] || `${prop.name as string}_id`;
//       columns.push({
//         name: fieldName,
//         type: "uuid", // Usually foreign keys reference UUID primary keys
//         nullable: (prop.nullable as boolean) ?? false,
//         primaryKey: false,
//         unique: refType === "1:1",
//       });
//       continue;
//     }

//     const column = extractColumn(prop);
//     columns.push(column);

//     if (prop.primary) {
//       primaryKey.push(column.name);
//     }
//   }

//   return {
//     name: meta.tableName as string,
//     schema: (meta.schema as string) || "public",
//     columns,
//     indexes: extractIndexes(meta),
//     foreignKeys: extractForeignKeys(meta),
//     primaryKey,
//   };
// }
