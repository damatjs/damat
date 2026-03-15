import type { SchemaChange } from "./changes";

/**
 * The result of comparing two module snapshots.
 */
export interface SchemaDiff {
  /** Whether any changes were detected */
  hasChanges: boolean;
  /** Ordered list of changes (sorted by priority) */
  changes: SchemaChange[];
  /** Non-fatal warnings (e.g. destructive operations) */
  warnings: string[];
}
