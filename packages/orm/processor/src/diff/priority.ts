/**
 * Priority Constants
 *
 * Priority order for schema changes (lower = execute first)
 *
 * Order matters for:
 * - Enums must be created before tables that use them
 * - Tables must be created before foreign keys reference them
 * - Columns must be added before indexes reference them
 * - Foreign keys must be dropped before columns they reference
 * - Indexes must be dropped before columns they reference
 */

export const PRIORITY = {
  // Create operations (low priority = first)
  CREATE_ENUM: 10,
  CREATE_TABLE: 20,
  ADD_COLUMN: 30,
  ADD_INDEX: 40,
  ADD_FOREIGN_KEY: 50,

  // Alter operations
  ALTER_ENUM: 60,
  ALTER_COLUMN: 70,
  RENAME_COLUMN: 75,
  RENAME_TABLE: 80,

  // Drop operations (high priority = last in up, first in down)
  DROP_FOREIGN_KEY: 100,
  DROP_INDEX: 110,
  DROP_COLUMN: 120,
  DROP_TABLE: 130,
  DROP_ENUM: 140,
} as const;
