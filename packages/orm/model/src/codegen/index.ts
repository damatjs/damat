import { ColumnSchema, ColumnType } from "@/types/column";
import { ModuleSchema, RelationSchema } from "@/types";
import { pgTypeToTsBase } from "@/utils/pgTypeToTsBase";
import { toPascalCase } from "@/utils/toPascalCase";

// ─── Column TS type resolution ────────────────────────────────────────────────

/**
 * Resolve the TypeScript type string for a single `ColumnSchema`.
 *
 * Mirrors the logic in `ColumnBuilder.toTsType()` but works from the
 * serialized `ColumnSchema` rather than a live builder instance.
 */
function columnToTsType(col: ColumnSchema): string {
  // Named enum — use the enum name directly as the type reference.
  const base: string =
    col.type === "enum" && col.enum
      ? col.enum
      : pgTypeToTsBase(col.type as ColumnType);

  // Inline object-literal types (e.g. geometric / range types) need parens
  // before `| null` to keep the union unambiguous.
  const needsParens = (t: string): boolean => {
    let depth = 0;
    for (let i = 0; i < t.length - 3; i++) {
      const ch = t[i];
      if (ch === "{" || ch === "<") depth++;
      else if (ch === "}" || ch === ">") depth--;
      else if (depth === 0 && t.slice(i, i + 3) === " | ") return true;
    }
    return false;
  };

  const withArray = col.array ? `Array<${base}>` : base;

  if (!col.nullable) return withArray;
  if (!col.array && needsParens(base)) return `(${base}) | null`;
  return `${withArray} | null`;
}

// ─── Auto-default detection ───────────────────────────────────────────────────

/**
 * Column names that are always auto-populated by the database or application
 * layer and therefore belong in the omit list of the `New*` insert type.
 *
 * The list is intentionally conservative — only columns that are universally
 * auto-managed.  Callers can extend this via `GenerateTypesOptions.autoFields`.
 */
const DEFAULT_AUTO_FIELDS = new Set([
  "id",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
]);

// ─── Relation helpers ─────────────────────────────────────────────────────────

/**
 * Build a map of  tableName → RelationSchema[]  for quick look-up.
 * Only relations that originate from a given table are grouped together.
 */
function buildRelationMap(
  relationships: RelationSchema[],
): Map<string, RelationSchema[]> {
  const map = new Map<string, RelationSchema[]>();
  for (const rel of relationships) {
    const list = map.get(rel.from) ?? [];
    list.push(rel);
    map.set(rel.from, list);
  }
  return map;
}

/**
 * For a given table's `RelationSchema[]`, produce the optional loaded-relation
 * fields to append to the row interface.
 *
 * - `belongsTo`  → `target?: TargetType`    (singular loaded entity)
 * - `hasMany`    → `targets?: TargetType[]`  (loaded collection, pluralised)
 * - `hasOne`     → `target?: TargetType`     (singular loaded entity)
 *
 * Field name derivation (since `from` in RelationSchema is the source table
 * name, not the property name):
 *   - `belongsTo` — strip `_id` from the first `linkedBy` FK column, e.g.
 *                   `category_id` → `category`.
 *   - `hasMany`   — camelCase of the target table name, pluralised with an
 *                   `s` suffix, e.g. `order` → `orders`.
 *   - `hasOne`    — camelCase of the target table name, e.g. `profile`.
 */
function relationFields(relations: RelationSchema[]): string[] {
  return relations.map((rel) => {
    const targetType = toPascalCase(rel.to);

    let fieldName: string;
    if (rel.type === "belongsTo") {
      const fkCol = rel.linkedBy?.[0];
      fieldName = fkCol ? fkCol.replace(/_id$/, "") : toCamelCase(rel.to);
    } else if (rel.type === "hasMany") {
      // Pluralise: append 's' unless the name already ends in 's'
      const base = toCamelCase(rel.to);
      fieldName = base.endsWith("s") ? base : `${base}s`;
    } else {
      fieldName = toCamelCase(rel.to);
    }

    const tsType = rel.type === "hasMany" ? `${targetType}[]` : targetType;

    return `  ${fieldName}?: ${tsType};`;
  });
}

/** snake_case → camelCase (simple single-pass) */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

// ─── Section generators ───────────────────────────────────────────────────────

/**
 * Emit all enum type aliases for the module, e.g.:
 *
 * ```ts
 * export type product_status = 'draft' | 'active' | 'archived';
 * ```
 */
function generateEnumTypes(schema: ModuleSchema): string[] {
  if (!schema.enums || schema.enums.length === 0) return [];

  return schema.enums.map((e) => {
    const union = e.values.map((v) => `'${v}'`).join(" | ");
    return `export type ${e.name} = ${union};`;
  });
}

/**
 * Emit the row interface for a table, e.g.:
 *
 * ```ts
 * export interface Product {
 *   id: string;
 *   title: string;
 *   status: product_status;
 *   category_id: string | null;
 *   // loaded relations (optional)
 *   category?: Category;
 *   orderItems?: OrderItem[];
 * }
 * ```
 */
function generateRowInterface(
  table: ModuleSchema["tables"][number],
  relations: RelationSchema[],
): string[] {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  // Columns
  for (const col of table.columns) {
    lines.push(`  ${col.name}: ${columnToTsType(col)};`);
  }

  // Loaded relation fields (optional)
  const relLines = relationFields(relations);
  if (relLines.length > 0) {
    lines.push(`  // loaded relations`);
    lines.push(...relLines);
  }

  return [`export interface ${name} {`, ...lines, `}`];
}

/**
 * Emit the `New*` insert type — all non-auto fields required, columns that
 * have a DB-level default become optional.
 *
 * ```ts
 * export type NewProduct = {
 *   title: string;
 *   status?: product_status;   // has a default
 *   category_id?: string | null;
 * };
 * ```
 */
function generateNewType(
  table: ModuleSchema["tables"][number],
  autoFields: Set<string>,
): string[] {
  const name = toPascalCase(table.name);
  const lines: string[] = [];

  for (const col of table.columns) {
    if (autoFields.has(col.name)) continue;

    const tsType = columnToTsType(col);
    // Column is optional in New type if it has a default OR is nullable
    // (the DB / app layer will fill it in when omitted).
    const optional = col.default !== undefined || col.nullable;
    lines.push(`  ${col.name}${optional ? "?" : ""}: ${tsType};`);
  }

  return [`export type New${name} = {`, ...lines, `};`];
}

/**
 * Emit the `Update*` partial update type — all non-PK columns optional.
 *
 * ```ts
 * export type UpdateProduct = Partial<Omit<Product, 'id'>>;
 * ```
 */
function generateUpdateType(table: ModuleSchema["tables"][number]): string[] {
  const name = toPascalCase(table.name);
  const pkCols = table.columns
    .filter((c) => c.primaryKey)
    .map((c) => `'${c.name}'`);

  if (pkCols.length === 0) {
    return [`export type Update${name} = Partial<${name}>;`];
  }

  const omit = pkCols.length === 1 ? pkCols[0] : pkCols.join(" | ");

  return [`export type Update${name} = Partial<Omit<${name}, ${omit}>>;`];
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface GenerateTypesOptions {
  /**
   * Column names that are always auto-generated and must be excluded from the
   * `New*` insert type.  Merged with the built-in set:
   * `id`, `createdAt`, `created_at`, `updatedAt`, `updated_at`.
   */
  autoFields?: string[];

  /**
   * Prepend a banner comment to the output file, e.g. a "do not edit" notice.
   * Defaults to a standard generated-file warning.
   */
  banner?: string | false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate TypeScript type declarations for an entire `ModuleSchema`.
 *
 * Produces four things per model:
 *   1. `export interface Product { ... }`         — full row shape
 *   2. `export type NewProduct = { ... }`         — insert payload (defaults optional)
 *   3. `export type UpdateProduct = Partial<...>` — partial update payload
 *   4. Optional loaded-relation fields on the row interface
 *
 * Plus one `export type` per enum at the top of the file.
 *
 * The return value is the full contents of a `.ts` file ready to be written
 * to disk.  No imports are emitted — every type is self-contained.
 *
 * ```ts
 * import { toModuleSchema } from "@damatjs/orm-model";
 * import { generateTypes } from "@damatjs/orm-model/codegen";
 * import { writeFileSync } from "fs";
 *
 * const schema = toModuleSchema("store", [UserSchema, OrderSchema]);
 * writeFileSync("src/generated/types.ts", generateTypes(schema));
 * ```
 */
export function generateTypes(
  schema: ModuleSchema,
  options: GenerateTypesOptions = {},
): string {
  const autoFields = new Set([
    ...DEFAULT_AUTO_FIELDS,
    ...(options.autoFields ?? []),
  ]);

  const banner =
    options.banner === false
      ? null
      : (options.banner ??
        "// This file is auto-generated. Do not edit it manually.\n" +
          "// Re-generate by running: bun run codegen\n");

  const relationMap = buildRelationMap(schema.relationships ?? []);

  const sections: string[][] = [];

  // ── Enums ─────────────────────────────────────────────────────────────────
  const enumLines = generateEnumTypes(schema);
  if (enumLines.length > 0) {
    sections.push(enumLines);
  }

  // ── Per-table types ───────────────────────────────────────────────────────
  for (const table of schema.tables) {
    const rels = relationMap.get(table.name) ?? [];

    sections.push(generateRowInterface(table, rels));
    sections.push(generateNewType(table, autoFields));
    sections.push(generateUpdateType(table));
  }

  const body = sections.map((s) => s.join("\n")).join("\n\n");

  return banner ? `${banner}\n${body}\n` : `${body}\n`;
}
