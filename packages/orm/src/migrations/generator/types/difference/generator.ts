import { SchemaDiff } from './schema';

/**
 * Options for generating migrations
 */
export interface MigrationGeneratorOptions {
    /** Include table drops in down migration (default: true) */
    generateDown?: boolean;
    /** Add CASCADE to drops (default: false) */
    cascadeDrops?: boolean;
    /** Generate IF EXISTS/IF NOT EXISTS clauses (default: true) */
    safeMode?: boolean;
    /** Custom schema name (default: public) */
    schema?: string;
    /** Whether to generate reversible migrations when possible */
    reversible?: boolean;
}

/**
 * Generated migration content
 */
export interface GeneratedMigration {
    /** The up migration SQL statements */
    upStatements: string[];
    /** The down migration SQL statements */
    downStatements: string[];
    /** Description of changes */
    description: string;
    /** Warnings to show to the user */
    warnings: string[];
}


/**
 * Options for creating a diff-based migration
 */
export interface CreateDiffMigrationOptions extends MigrationGeneratorOptions {
    /** Update the schema snapshot after creating migration */
    updateSnapshot?: boolean;
    /** Force creation even if no changes detected */
    force?: boolean;
}

/**
 * Result of creating a diff-based migration
 */
export interface DiffMigrationResult {
    /** Path to created migration file (null if no changes) */
    filePath: string | null;
    /** Whether changes were detected */
    hasChanges: boolean;
    /** The schema diff */
    diff: SchemaDiff;
    /** Generated migration content */
    migration: GeneratedMigration | null;
    /** Warnings from the diff/generation process */
    warnings: string[];
}
