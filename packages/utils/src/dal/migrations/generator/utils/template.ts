import type { GeneratedMigration } from "../types";

/**
 * Get the base migration template (empty)
 */
export const getMigrationTemplate = (
  className: string,
  name: string,
  moduleName: string,
  timestamp: Date,
): string => {
  return `import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: ${name}
 * Module: ${moduleName}
 * Created: ${timestamp.toISOString()}
 */
export class ${className} extends Migration {
    /**
     * Apply the migration
     */
    async up(): Promise<void> {
        // Write your UP migration SQL here
        // this.addSql('CREATE TABLE ...');
    }

    /**
     * Revert the migration
     */
    async down(): Promise<void> {
        // Write your DOWN migration SQL here
        // this.addSql('DROP TABLE IF EXISTS ...');
    }
}
`;
};

/**
 * Format SQL statements for use in migration template
 */
function formatSqlStatements(statements: string[]): string {
  return statements
    .map((sql) => {
      // Handle multi-line SQL (like DO blocks)
      if (sql.includes("\n")) {
        return `this.addSql(\`${sql}\`);`;
      }
      // Single line SQL
      return `this.addSql('${sql.replace(/'/g, "\\'")}');`;
    })
    .join("\n        ");
}

/**
 * Get a migration template with generated SQL code
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

  // Generate warning comments if any
  const warningComments =
    migration.warnings.length > 0
      ? migration.warnings.map((w) => ` * WARNING: ${w}`).join("\n") + "\n *\n"
      : "";

  return `import { Migration } from '@mikro-orm/migrations';

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
export class ${className} extends Migration {
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

/**
 * Get a migration template for creating initial tables
 * (Full schema generation without diffing)
 */
export const getInitialMigrationTemplate = (
  className: string,
  name: string,
  moduleName: string,
  timestamp: Date,
  upStatements: string[],
  downStatements: string[],
): string => {
  const upSql =
    upStatements.length > 0
      ? formatSqlStatements(upStatements)
      : "// No tables to create";

  const downSql =
    downStatements.length > 0
      ? formatSqlStatements(downStatements)
      : "// No tables to drop";

  return `import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: ${name}
 * Module: ${moduleName}
 * Created: ${timestamp.toISOString()}
 *
 * Initial migration - creates all tables for the ${moduleName} module.
 */
export class ${className} extends Migration {
    /**
     * Apply the migration - create tables
     */
    async up(): Promise<void> {
        ${upSql}
    }

    /**
     * Revert the migration - drop tables
     */
    async down(): Promise<void> {
        ${downSql}
    }
}
`;
};
