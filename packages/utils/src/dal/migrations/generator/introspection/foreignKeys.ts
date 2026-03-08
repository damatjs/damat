/**
 * Foreign Key Extraction
 *
 * Extract foreign key schema from MikroORM entity metadata.
 */

import type { ForeignKeySchema } from "../types";
import { isRelation } from "./typeMapping";

/**
 * Extract foreign keys from entity metadata
 */
export function extractForeignKeys(
  meta: Record<string, unknown>,
): ForeignKeySchema[] {
  const foreignKeys: ForeignKeySchema[] = [];
  const tableName = meta.tableName as string;
  const properties = meta.properties as Record<string, Record<string, unknown>>;

  for (const [, prop] of Object.entries(properties)) {
    // Check for ManyToOne or OneToOne relationships
    const refType = isRelation(prop);
    if (refType === "m:1" || refType === "1:1") {
      const targetMeta = prop.targetMeta as Record<string, unknown> | undefined;
      if (targetMeta) {
        const fieldNames = prop.fieldNames as string[] | undefined;
        const localColumn = fieldNames?.[0] || `${prop.name as string}_id`;

        const targetPrimaryKeys = targetMeta.primaryKeys as
          | string[]
          | undefined;
        const targetProperties = targetMeta.properties as
          | Record<string, Record<string, unknown>>
          | undefined;
        const targetIdProp = targetProperties?.id;
        const targetIdFieldNames = targetIdProp?.fieldNames as
          | string[]
          | undefined;

        const referencedColumn =
          targetPrimaryKeys?.[0] || targetIdFieldNames?.[0] || "id";

        foreignKeys.push({
          name: `fk_${tableName}_${localColumn}`,
          columns: [localColumn],
          referencedTable: targetMeta.tableName as string,
          referencedColumns: [referencedColumn],
          onDelete: prop.deleteRule as
            | "CASCADE"
            | "SET NULL"
            | "SET DEFAULT"
            | "RESTRICT"
            | "NO ACTION"
            | undefined,
          onUpdate: prop.updateRule as
            | "CASCADE"
            | "SET NULL"
            | "SET DEFAULT"
            | "RESTRICT"
            | "NO ACTION"
            | undefined,
        });
      }
    }
  }

  return foreignKeys;
}
