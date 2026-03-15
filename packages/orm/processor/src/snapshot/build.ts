import type {
  ModelDefinition,
  ModelProperties,
} from "@damatjs/orm-model/types";
import type { ModuleSnapshot, NativeEnum } from "../types/snapshot";

/**
 * Build a `ModuleSnapshot` from an array of model definitions.
 *
 * Pure — no I/O. This is the only place models are converted to table schemas.
 *
 * Named enum columns (those with `enumName`) are collected into `nativeEnums`
 * so the snapshot carries a complete picture of every PG enum type the module
 * owns alongside the inline enum values already embedded in each column.
 *
 * @param moduleName  Written into `snapshot.name`
 * @param models      All `ModelDefinition` objects belonging to this module
 * @param namespaces  PostgreSQL schema namespaces (defaults to `["public"]`)
 */
export function buildSnapshot(
  moduleName: string,
  models: ModelDefinition<ModelProperties>[],
  namespaces: string[] = ["public"],
): ModuleSnapshot {
  const nativeEnums: Record<string, NativeEnum> = {};

  const tables = models.map((m) => {
    const table = m.toTableSchema();

    for (const col of table.columns) {
      if (col.enumName && col.enumValues?.length) {
        const schema = table.schema ?? namespaces[0] ?? "public";
        nativeEnums[col.enumName] ??= {
          name: col.enumName,
          schema,
          values: col.enumValues,
        };
      }
    }

    return table;
  });

  return {
    namespaces,
    name: moduleName,
    tables,
    nativeEnums,
    updatedAt: new Date().toISOString(),
  };
}
