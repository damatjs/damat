import { ModuleSchema, EnumSchema } from "@damatjs/orm-type";
import { toPascalCase, toCamelCase } from "./stringConvertor";
import { columnToZodSchema } from "../columnToZodSchema";

/**
 * Generate Zod schema for creating new records.
 *
 * All non-auto fields required, columns with defaults become optional.
 *
 * ```ts
 * export const newUserSchema = z.object({
 *   email: z.string().email(),
 *   name: z.string().min(1),
 *   password: z.string().min(8),
 * }).strict();
 *
 * export type NewUserInput = z.infer<typeof newUserSchema>;
 * ```
 */
export const generateNewZodSchema = (
  table: ModuleSchema["tables"][number],
  autoFields: Set<string>,
  allEnums: EnumSchema[],
): string[] => {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  for (const col of table.columns) {
    // Skip auto-generated fields
    if (autoFields.has(col.name)) continue;

    // Skip timestamps and soft delete
    if (["deleted_at", "created_at", "updated_at"].includes(col.name)) continue;

    let zodSchema = columnToZodSchema(col);

    // Handle enums with actual values
    if (col.type === "enum" && col.enum) {
      const enumSchema = allEnums.find((e) => e.name === col.enum);
      if (enumSchema && enumSchema.values.length > 0) {
        const enumValues = enumSchema.values.map((v) => `'${v}'`).join(", ");
        zodSchema = `z.enum([${enumValues}])`;
      }
    }

    // Handle nullable - make it optional and handle null
    if (col.nullable) {
      lines.push(`  ${col.name}: ${zodSchema}.nullable().optional(),`);
    } else if (col.default !== undefined) {
      // Has default - optional
      lines.push(`  ${col.name}: ${zodSchema}.optional(),`);
    } else {
      lines.push(`  ${col.name}: ${zodSchema},`);
    }
  }

  return [
    `export const new${name}Schema = z.object({`,
    ...lines,
    `}).strict();`,
    ``,
    `export type New${name}Input = z.infer<typeof new${name}Schema>;`,
  ];
};

/**
 * Generate Zod schema for partial updates.
 *
 * All fields optional.
 *
 * ```ts
 * export const updateUserSchema = z.object({
 *   email: z.string().email().optional(),
 *   name: z.string().min(1).optional(),
 * }).strict();
 *
 * export type UpdateUserInput = z.infer<typeof updateUserSchema>;
 * ```
 */
export const generateUpdateZodSchema = (
  table: ModuleSchema["tables"][number],
  allEnums: EnumSchema[],
): string[] => {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  for (const col of table.columns) {
    // Skip primary keys and auto-generated fields
    if (col.primaryKey) continue;
    if (["deleted_at", "created_at", "updated_at", "id"].includes(col.name)) continue;

    let zodSchema = columnToZodSchema(col);

    // Handle enums with actual values
    if (col.type === "enum" && col.enum) {
      const enumSchema = allEnums.find((e) => e.name === col.enum);
      if (enumSchema && enumSchema.values.length > 0) {
        const enumValues = enumSchema.values.map((v) => `'${v}'`).join(", ");
        zodSchema = `z.enum([${enumValues}])`;
      }
    }

    // All fields are optional for update
    if (col.nullable) {
      lines.push(`  ${col.name}: ${zodSchema}.nullable().optional(),`);
    } else {
      lines.push(`  ${col.name}: ${zodSchema}.optional(),`);
    }
  }

  return [
    `export const update${name}Schema = z.object({`,
    ...lines,
    `}).strict();`,
    ``,
    `export type Update${name}Input = z.infer<typeof update${name}Schema>;`,
  ];
};

/**
 * Generate Zod schema for query parameters (filters, pagination, etc.)
 *
 * ```ts
 * export const userQuerySchema = z.object({
 *   id: z.string().optional(),
 *   email: z.string().optional(),
 *   limit: z.coerce.number().int().positive().optional(),
 *   offset: z.coerce.number().int().min(0).optional(),
 * }).strict();
 * ```
 */
export const generateQueryZodSchema = (
  table: ModuleSchema["tables"][number],
  allEnums: EnumSchema[],
): string[] => {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  for (const col of table.columns) {
    let zodSchema = columnToZodSchema(col);

    // Handle enums with actual values
    if (col.type === "enum" && col.enum) {
      const enumSchema = allEnums.find((e) => e.name === col.enum);
      if (enumSchema && enumSchema.values.length > 0) {
        const enumValues = enumSchema.values.map((v) => `'${v}'`).join(", ");
        zodSchema = `z.enum([${enumValues}])`;
      }
    }

    // Query params come as strings, coerce to proper types for numbers
    if (["integer", "smallint", "serial", "smallserial"].includes(col.type as string)) {
      zodSchema = "z.coerce.number().int()";
    } else if (col.type === "bigint" || col.type === "bigserial") {
      zodSchema = "z.coerce.bigint()";
    } else if (col.type === "boolean") {
      zodSchema = "z.coerce.boolean()";
    }

    // All fields optional for query
    if (col.nullable) {
      lines.push(`  ${col.name}: ${zodSchema}.nullable().optional(),`);
    } else {
      lines.push(`  ${col.name}: ${zodSchema}.optional(),`);
    }
  }

  // Add pagination fields
  lines.push(`  limit: z.coerce.number().int().positive().optional(),`);
  lines.push(`  offset: z.coerce.number().int().min(0).optional(),`);
  lines.push(`  orderBy: z.string().optional(),`);
  lines.push(`  orderDir: z.enum(['asc', 'desc']).optional(),`);

  return [
    `export const ${toCamelCase(name)}QuerySchema = z.object({`,
    ...lines,
    `}).strict();`,
    ``,
    `export type ${name}Query = z.infer<typeof ${toCamelCase(name)}QuerySchema>;`,
  ];
};

/**
 * Map a primary-key column to the Zod schema that validates (and coerces) a
 * single id value. Path params and query strings arrive as strings, so numeric
 * keys are coerced.
 */
const primaryKeyZodSchema = (
  pkCol: ModuleSchema["tables"][number]["columns"][number],
): string => {
  if (pkCol.type === "uuid") return "z.string().uuid()";
  if (pkCol.type === "integer" || pkCol.type === "serial") {
    return "z.coerce.number().int().positive()";
  }
  if (pkCol.type === "bigint" || pkCol.type === "bigserial") {
    return "z.coerce.bigint()";
  }
  return "z.string()";
};

/**
 * Generate Zod schema for record IDs.
 *
 * ```ts
 * export const userIdSchema = z.string().uuid();
 * export type UserId = z.infer<typeof userIdSchema>;
 * ```
 */
export const generateIdZodSchema = (
  table: ModuleSchema["tables"][number],
): string[] => {
  const name = toPascalCase(table.name);
  const pkCol = table.columns.find((c) => c.primaryKey);

  if (!pkCol) return [];

  const idSchema = primaryKeyZodSchema(pkCol);

  return [
    `export const ${toCamelCase(name)}IdSchema = ${idSchema};`,
    ``,
    `export type ${name}Id = z.infer<typeof ${toCamelCase(name)}IdSchema>;`,
  ];
};

/**
 * Generate the Zod schema for the single-resource route's path params.
 *
 * The `[id]` route folder maps to the `:id` URL param, so the params object is
 * always keyed by `id`; its value is validated/coerced with the primary key's
 * type. This is what a route's `params` validator references so the framework
 * rejects a missing/invalid id before the handler runs.
 *
 * ```ts
 * export const UserParamsSchema = z.object({
 *   id: z.string().uuid(),
 * }).strict();
 * export type UserParams = z.infer<typeof UserParamsSchema>;
 * ```
 */
export const generateParamsZodSchema = (
  table: ModuleSchema["tables"][number],
): string[] => {
  const name = toPascalCase(table.name);
  const pkCol = table.columns.find((c) => c.primaryKey);

  if (!pkCol) return [];

  const idSchema = primaryKeyZodSchema(pkCol);

  return [
    `export const ${name}ParamsSchema = z.object({`,
    `  id: ${idSchema},`,
    `}).strict();`,
    ``,
    `export type ${name}Params = z.infer<typeof ${name}ParamsSchema>;`,
  ];
};
