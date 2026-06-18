import { model, columns, type ModelDefinition } from "@damatjs/orm-model";
import type { LinkOptions } from "./types";

export interface BuildPivotInput {
  table: string;
  leftColumn: string;
  rightColumn: string;
  idPrefix: string;
  /** When set, emit a real FK column (belongsTo) to these target tables. */
  foreignKeys?: { leftTarget: string; rightTarget: string };
  options: LinkOptions;
}

/**
 * Build the junction `ModelDefinition` for a link. It is an ordinary ORM model —
 * which is the whole point: it flows through the existing migration, snapshot,
 * and codegen pipelines unchanged.
 *
 * Columns: `id` (generated, prefixed), the two foreign-key columns, plus the
 * default `created_at` / `updated_at` / `deleted_at` (ModelDefinition enables
 * timestamps + soft-delete by default). A unique index over the two FK columns
 * makes link creation idempotent and prevents duplicate links; a per-column
 * index keeps lookups in both directions fast.
 */
export function buildPivotModel(input: BuildPivotInput): ModelDefinition {
  const { table, leftColumn, rightColumn, idPrefix, foreignKeys, options } = input;

  const leftCol = foreignKeys
    ? columns.belongsTo(foreignKeys.leftTarget).link({ foreignKey: leftColumn }).indexed()
    : columns.text();
  const rightCol = foreignKeys
    ? columns.belongsTo(foreignKeys.rightTarget).link({ foreignKey: rightColumn }).indexed()
    : columns.text();

  const props: Record<string, any> = {
    id: columns.id({ prefix: idPrefix }).primaryKey(),
    [leftColumn]: leftCol,
    [rightColumn]: rightCol,
    ...(options.database?.extraColumns ?? {}),
  };

  const pivot = model(table, props).indexes([
    columns.indexes(`${table}_pair_uniq`).columns([leftColumn, rightColumn]).unique(),
    columns.indexes(`${table}_${leftColumn}_idx`).columns([leftColumn]),
    columns.indexes(`${table}_${rightColumn}_idx`).columns([rightColumn]),
  ]);

  return pivot;
}
