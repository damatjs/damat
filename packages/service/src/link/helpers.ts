/**
 * Link Module - Helper Functions
 *
 * Utilities for defining links and generating SQL.
 */

import type { LinkDefinition } from "./types";

/**
 * Define a link between two modules
 */
export function defineLink(definition: LinkDefinition): LinkDefinition {
  return {
    onDelete: "cascade",
    ...definition,
  };
}

/**
 * Generate SQL for creating a junction table (many-to-many)
 */
export function generateJunctionTableSQL(link: LinkDefinition): {
  up: string;
  down: string;
} {
  const tableName = `${link.name}_link`;
  const fromCol = `${link.from.module}_id`;
  const toCol = `${link.to.module}_id`;

  const up = `
CREATE TABLE IF NOT EXISTS "${tableName}" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "${fromCol}" UUID NOT NULL,
    "${toCol}" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "metadata" JSONB DEFAULT '{}',
    UNIQUE("${fromCol}", "${toCol}")
);

CREATE INDEX IF NOT EXISTS "idx_${tableName}_${fromCol}" ON "${tableName}"("${fromCol}");
CREATE INDEX IF NOT EXISTS "idx_${tableName}_${toCol}" ON "${tableName}"("${toCol}");
`.trim();

  const down = `DROP TABLE IF EXISTS "${tableName}" CASCADE;`;

  return { up, down };
}
