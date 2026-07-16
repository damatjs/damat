import type { ColumnSchema, EnumSchema } from "@damatjs/orm-type";
import { columnToZodSchema } from "@/columnToZodSchema";

export function enumZodSchema(
  column: ColumnSchema,
  allEnums: EnumSchema[],
): string {
  const base = columnToZodSchema(column);
  if (column.type !== "enum" || !column.enum) return base;
  const enumSchema = allEnums.find((entry) => entry.name === column.enum);
  if (!enumSchema || enumSchema.values.length === 0) return base;
  const values = enumSchema.values.map((value) => `'${value}'`).join(", ");
  return `z.enum([${values}])`;
}

export function primaryKeyZodSchema(column: ColumnSchema): string {
  if (column.type === "uuid") return "z.string().uuid()";
  if (column.type === "integer" || column.type === "serial") {
    return "z.coerce.number().int().positive()";
  }
  if (column.type === "bigint" || column.type === "bigserial") {
    return "z.coerce.bigint()";
  }
  return "z.string()";
}
