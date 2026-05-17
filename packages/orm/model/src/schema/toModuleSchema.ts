import { EnumBuilder } from "@/properties/enum";
import { ModuleSchema, RelationSchema } from "@/types";
import { ModelDefinition } from "./model";

/**
 * Collect all tables from a list of models and build a ModuleSchema.
 *
 * Relations are hoisted out of individual table schemas and collected into a
 * single module-level `relationships` array.  Each relation entry is annotated
 * with the `fromTable` name so consumers can identify its origin.
 *
 * ```ts
 * const schema = toModuleSchema("store", [UserSchema, OrderSchema], {
 *   enums: [OrderStatusEnum],
 *   schema: "public",
 * });
 * ```
 */
export function toModuleSchema(
  moduleName: string,
  models: ModelDefinition[],
  options?: {
    /** PostgreSQL schema name (default: "public") */
    schema?: string;
    /** Enum types declared at module level */
    enums?: EnumBuilder[];
  },
): ModuleSchema {
  const relationships: RelationSchema[] = [];

  const tables = models.map((m) => {
    const tableSchema = m.toTableSchema();
    // Hoist per-table relations into the module-level collection
    const { relations, ...rest } = tableSchema;
    if (relations)
      relationships.push(...relations)
    return rest;
  });

  return {
    moduleName,
    ...(options?.schema !== undefined
      ? { schema: options.schema }
      : { schema: "public" }),
    tables,
    enums: (options?.enums ?? []).map((e) => e.toSchema()),
    relationships,
  };
}
