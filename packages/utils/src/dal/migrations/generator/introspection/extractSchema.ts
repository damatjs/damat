// /**
//  * Schema Extraction
//  *
//  * Extract schema from MikroORM entities.
//  */

// import type {
//   EntityClass,
//   MikroORM,
// } from "@damatjs/deps/mikro-orm/postgresql";

// import type { EnumSchema, ModuleSchema, TableSchema } from "../types";
// import { extractTableSchema } from "./tables";

// /**
//  * Extract schema from MikroORM entities
//  *
//  * @param entities - Array of entity classes
//  * @param orm - MikroORM instance (optional, needed for full metadata)
//  * @returns Array of table schemas
//  */
// export function extractSchemaFromEntities(
//   entities: EntityClass<unknown>[],
//   orm?: MikroORM,
// ): TableSchema[] {
//   const tables: TableSchema[] = [];

//   if (orm) {
//     const metadata = orm.getMetadata();

//     for (const entity of entities) {
//       const meta = metadata.get(entity.name);
//       if (meta) {
//         tables.push(
//           extractTableSchema(meta as unknown as Record<string, unknown>),
//         );
//       }
//     }
//   }

//   return tables;
// }

// /**
//  * Extract complete module schema including enums
//  *
//  * @param moduleName - Name of the module
//  * @param entities - Array of entity classes
//  * @param orm - MikroORM instance
//  * @returns Complete module schema
//  */
// export function extractModuleSchema(
//   moduleName: string,
//   entities: EntityClass<unknown>[],
//   orm?: MikroORM,
// ): ModuleSchema {
//   const tables = extractSchemaFromEntities(entities, orm);
//   const enums: EnumSchema[] = [];

//   // Collect all enum definitions from columns
//   for (const table of tables) {
//     for (const column of table.columns) {
//       if (column.type === "enum" && column.enumName && column.enumValues) {
//         // Check if enum already exists
//         const exists = enums.some((e) => e.name === column.enumName);
//         if (!exists) {
//           enums.push({
//             name: column.enumName,
//             values: column.enumValues,
//           });
//         }
//       }
//     }
//   }

//   return {
//     moduleName,
//     tables,
//     enums,
//   };
// }
