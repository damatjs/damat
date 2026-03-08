/**
 * CLI Help Text
 *
 * Help text and usage information for the migration CLI.
 */

/**
 * Help text displayed for --help or unknown commands.
 */
export const HELP_TEXT = `
┌─────────────────────────────────────────────────────────────────┐
│              Module Migration CLI (MikroORM)                    │
├─────────────────────────────────────────────────────────────────┤
│  Self-contained module migrations with UP/DOWN support          │
└─────────────────────────────────────────────────────────────────┘

Usage: npm run db:migrate:<command>

Commands:
  (none), up              Run all pending migrations
  status                  Show detailed migration status
  create <module> <name>  Create a new migration
  revert <module> [count] Revert last N migrations for a module (default: 1)
  list                    List all modules with migrations

Options for revert:
  --all                   Revert all migrations for the module

Examples:
  npm run db:migrate
  npm run db:migrate:status
  npm run db:migrate:create user AddPhoneColumn
  npm run db:migrate:revert user
  npm run db:migrate:revert user 3
  npm run db:migrate:revert user --all

Environment:
  DATABASE_URL        PostgreSQL connection string (required)

Documentation:
  See docs/MIGRATIONS.md for full documentation.
`;
