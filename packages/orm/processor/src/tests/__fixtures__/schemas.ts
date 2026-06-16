/**
 * Inline schema fixtures used to drive the processor tests.
 *
 * These intentionally use the raw `@damatjs/orm-type` shapes (ColumnSchema,
 * TableSchema, ModuleSchema, ...) so the tests exercise the diff / SQL
 * generator code exactly as the migration package does.
 */

import type {
  ColumnSchema,
  EnumSchema,
  ForeignKeySchema,
  IndexSchema,
  ModuleSchema,
  TableSchema,
} from "@damatjs/orm-type";

// ─── column helpers ────────────────────────────────────────────────────────

export function col(
  name: string,
  overrides: Partial<ColumnSchema> = {},
): ColumnSchema {
  return {
    name,
    type: "text",
    nullable: false,
    ...overrides,
  };
}

export const idColumn: ColumnSchema = {
  name: "id",
  type: "text",
  primaryKey: true,
  nullable: false,
  default: "generate_id('usr')",
};

// ─── building blocks ───────────────────────────────────────────────────────

export function table(
  name: string,
  columns: ColumnSchema[],
  extra: Partial<Omit<TableSchema, "name" | "columns" | "relations">> = {},
): Omit<TableSchema, "relations"> {
  return { name, columns, ...extra };
}

export function moduleSchema(
  overrides: Partial<ModuleSchema> = {},
): ModuleSchema {
  return {
    moduleName: "test",
    schema: "public",
    tables: [],
    enums: [],
    relationships: [],
    ...overrides,
  };
}

// ─── concrete fixtures ─────────────────────────────────────────────────────

export const userColumns: ColumnSchema[] = [
  idColumn,
  { name: "email", type: "text", nullable: false, unique: true },
  { name: "name", type: "character varying", nullable: false, length: 128 },
  { name: "age", type: "integer", nullable: true },
];

export const userTable = table("user", userColumns);

export const emptyModule: ModuleSchema = moduleSchema();

export const userModule: ModuleSchema = moduleSchema({
  tables: [userTable],
});

// Enum fixtures
export const statusEnum: EnumSchema = {
  name: "user_status",
  values: ["active", "inactive"],
};

export const statusEnumExtended: EnumSchema = {
  name: "user_status",
  values: ["active", "inactive", "banned"],
};

// Index fixtures
export const emailIndex: IndexSchema = {
  name: "user_email_idx",
  columns: [{ name: "email" }],
  unique: true,
  type: "btree",
};

export const ginTagsIndex: IndexSchema = {
  name: "post_tags_gin",
  columns: ["tags"],
  type: "gin",
};

// Foreign key fixtures
export const categoryFk: ForeignKeySchema = {
  name: "product_category_id_fk",
  columns: [{ name: "category_id", type: "text" }],
  referencedTable: "category",
  referencedColumns: ["id"],
  onDelete: "SET NULL",
};
