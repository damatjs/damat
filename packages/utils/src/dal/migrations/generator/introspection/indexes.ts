// /**
//  * Index Extraction
//  *
//  * Extract index schema from MikroORM entity metadata.
//  */

// import type { IndexSchema } from "../types";

// /**
//  * Extract indexes from entity metadata
//  */
// export function extractIndexes(meta: Record<string, unknown>): IndexSchema[] {
//   const indexes: IndexSchema[] = [];
//   const tableName = meta.tableName as string;
//   const properties = meta.properties as Record<string, Record<string, unknown>>;

//   // Extract indexes from entity-level decorators
//   const metaIndexes = meta.indexes as
//     | Array<Record<string, unknown>>
//     | undefined;
//   if (metaIndexes) {
//     for (const idx of metaIndexes) {
//       const idxProperties = idx.properties;
//       if (!idxProperties) continue;

//       const propsArray = Array.isArray(idxProperties)
//         ? idxProperties
//         : [idxProperties];

//       indexes.push({
//         name:
//           (idx.name as string) || `idx_${tableName}_${propsArray.join("_")}`,
//         columns: propsArray.map((p: string) => {
//           const prop = properties[p];
//           const fieldNames = prop?.fieldNames as string[] | undefined;
//           return fieldNames?.[0] || p;
//         }),
//         unique: false,
//         type: idx.type as
//           | "btree"
//           | "hash"
//           | "gin"
//           | "gist"
//           | "brin"
//           | undefined,
//       });
//     }
//   }

//   // Extract unique indexes
//   const metaUniques = meta.uniques as
//     | Array<Record<string, unknown>>
//     | undefined;
//   if (metaUniques) {
//     for (const uniq of metaUniques) {
//       const uniqProperties = uniq.properties;
//       if (!uniqProperties) continue;

//       const propsArray = Array.isArray(uniqProperties)
//         ? uniqProperties
//         : [uniqProperties];

//       indexes.push({
//         name:
//           (uniq.name as string) || `uniq_${tableName}_${propsArray.join("_")}`,
//         columns: propsArray.map((p: string) => {
//           const prop = properties[p];
//           const fieldNames = prop?.fieldNames as string[] | undefined;
//           return fieldNames?.[0] || p;
//         }),
//         unique: true,
//       });
//     }
//   }

//   // Extract column-level indexes
//   for (const [, prop] of Object.entries(properties)) {
//     const fieldNames = prop.fieldNames as string[] | undefined;
//     const fieldName = fieldNames?.[0] || (prop.name as string);

//     if (prop.index && !prop.primary) {
//       // Check if already included
//       const exists = indexes.some(
//         (idx) => idx.columns.length === 1 && idx.columns[0] === fieldName,
//       );
//       if (!exists) {
//         indexes.push({
//           name: `idx_${tableName}_${fieldName}`,
//           columns: [fieldName],
//           unique: false,
//         });
//       }
//     }
//     if (prop.unique === true && !prop.primary) {
//       // Check if already included
//       const exists = indexes.some(
//         (idx) =>
//           idx.unique &&
//           idx.columns.length === 1 &&
//           idx.columns[0] === fieldName,
//       );
//       if (!exists) {
//         indexes.push({
//           name: `uniq_${tableName}_${fieldName}`,
//           columns: [fieldName],
//           unique: true,
//         });
//       }
//     }
//   }

//   return indexes;
// }
