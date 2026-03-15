import type { SchemaDiff } from "./schema";

/**
 * Options controlling how SQL is generated from a diff or snapshot.
 */
export interface MigrationGeneratorOptions {
  /** Include down migration statements (default: true) */
  generateDown?: boolean;
  /** Add CASCADE to DROP statements (default: false) */
  cascadeDrops?: boolean;
  /** Emit IF EXISTS / IF NOT EXISTS guards (default: true) */
  safeMode?: boolean;
  /** Target PostgreSQL schema name (default: "public") */
  schema?: string;
  /** Generate reversible migrations wherever possible */
  reversible?: boolean;
}

/**
 * The SQL output of a migration generation pass.
 */
export interface GeneratedMigration {
  /** Ordered UP statements */
  upStatements: string[];
  /** Ordered DOWN / rollback statements */
  downStatements: string[];
  /** Human-readable summary of what changed */
  description: string;
  /** Non-fatal warnings surfaced to the caller */
  warnings: string[];
}

/**
 * Options for creating a diff-based migration file on disk.
 */
export interface CreateDiffMigrationOptions extends MigrationGeneratorOptions {
  /** Persist the new snapshot after writing the migration (default: true) */
  updateSnapshot?: boolean;
  /** Write a migration even when no changes are detected */
  force?: boolean;
}

/**
 * Result of a full diff → generate → write cycle.
 */
export interface DiffMigrationResult {
  /** Absolute path to the written migration file, or null if nothing was written */
  filePath: string | null;
  /** Whether any schema changes were detected */
  hasChanges: boolean;
  /** The computed schema diff */
  diff: SchemaDiff;
  /** Generated migration content, or null if nothing was written */
  migration: GeneratedMigration | null;
  /** Warnings collected during diff and generation */
  warnings: string[];
}
