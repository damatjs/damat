import type { GeneratedMigration } from "@/types";

/**
 * Format SQL statements for use in a migration method body.
 */
function formatSqlStatements(statements: string[]): string {
  return statements
    .map((sql) => {
      // Multi-line SQL (DO blocks etc.) uses template literals
      if (sql.includes("\n")) {
        return `this.addSql(\`${sql}\`);`;
      }
      // Single-line SQL — escape single quotes
      return `this.addSql('${sql.replace(/'/g, "\\'")}');`;
    })
    .join("\n        ");
}

/**
 * Get a migration template with auto-generated SQL.
 */
export const getMigrationTemplateWithSQL = (
  className: string,
  name: string,
  moduleName: string,
  timestamp: Date,
  migration: GeneratedMigration,
): string => {
  const upSql =
    migration.upStatements.length > 0
      ? formatSqlStatements(migration.upStatements)
      : "// No changes detected";

  const downSql =
    migration.downStatements.length > 0
      ? formatSqlStatements(migration.downStatements)
      : "// No automatic down migration generated";

  const warningComments =
    migration.warnings.length > 0
      ? migration.warnings.map((w) => ` * WARNING: ${w}`).join("\n") + "\n *\n"
      : "";

  return `import { BaseMigration } from '@damatjs/orm-migration';

/**
 * Migration: ${name}
 * Module: ${moduleName}
 * Created: ${timestamp.toISOString()}
 *
 * ${migration.description}
 *
${warningComments} * This migration was auto-generated based on schema changes.
 * Review the SQL statements before running in production.
 */
export class ${className} extends BaseMigration {
    /**
     * Apply the migration
     */
    async up(): Promise<void> {
        ${upSql}
    }

    /**
     * Revert the migration
     */
    async down(): Promise<void> {
        ${downSql}
    }
}
`;
};
