import type {
  ColumnSchema,
  ColumnType,
  ForeignKeySchema,
  IndexSchema,
  TableSchema,
} from "@damatjs/orm-model/types";
import type { NativeEnum } from "../snapshot";

// ─── tables ──────────────────────────────────────────────────────────────────

export interface CreateTableChange {
  type: "create_table";
  tableName: string;
  table: TableSchema;
  priority: number;
}

export interface DropTableChange {
  type: "drop_table";
  tableName: string;
  cascade: boolean;
  priority: number;
}

export interface RenameTableChange {
  type: "rename_table";
  fromName: string;
  toName: string;
  priority: number;
}

// ─── columns ─────────────────────────────────────────────────────────────────

export interface AddColumnChange {
  type: "add_column";
  tableName: string;
  column: ColumnSchema;
  priority: number;
}

export interface DropColumnChange {
  type: "drop_column";
  tableName: string;
  columnName: string;
  priority: number;
}

export interface RenameColumnChange {
  type: "rename_column";
  tableName: string;
  fromName: string;
  toName: string;
  priority: number;
}

export interface AlterColumnChange {
  type: "alter_column";
  tableName: string;
  columnName: string;
  priority: number;
  changes: {
    type?: { from: ColumnType; to: ColumnType };
    nullable?: { from: boolean; to: boolean };
    default?: { from: string | undefined; to: string | undefined };
    length?: { from: number | undefined; to: number | undefined };
    scale?: { from: number | undefined; to: number | undefined };
    unique?: { from: boolean; to: boolean };
    array?: { from: boolean; to: boolean };
  };
}

// ─── indexes ─────────────────────────────────────────────────────────────────

export interface AddIndexChange {
  type: "add_index";
  tableName: string;
  index: IndexSchema;
  priority: number;
}

export interface DropIndexChange {
  type: "drop_index";
  tableName: string;
  indexName: string;
  priority: number;
}

// ─── foreign keys ─────────────────────────────────────────────────────────────

export interface AddForeignKeyChange {
  type: "add_foreign_key";
  tableName: string;
  foreignKey: ForeignKeySchema;
  priority: number;
}

export interface DropForeignKeyChange {
  type: "drop_foreign_key";
  tableName: string;
  constraintName: string;
  priority: number;
}

// ─── native enums ─────────────────────────────────────────────────────────────

export interface CreateEnumChange {
  type: "create_enum";
  enumDef: NativeEnum;
  priority: number;
}

export interface DropEnumChange {
  type: "drop_enum";
  enumName: string;
  priority: number;
}

export interface AlterEnumChange {
  type: "alter_enum";
  enumName: string;
  addValues?: string[];
  removeValues?: string[];
  priority: number;
}

// ─── union ────────────────────────────────────────────────────────────────────

export type SchemaChange =
  | CreateTableChange
  | DropTableChange
  | RenameTableChange
  | AddColumnChange
  | DropColumnChange
  | RenameColumnChange
  | AlterColumnChange
  | AddIndexChange
  | DropIndexChange
  | AddForeignKeyChange
  | DropForeignKeyChange
  | CreateEnumChange
  | DropEnumChange
  | AlterEnumChange;
