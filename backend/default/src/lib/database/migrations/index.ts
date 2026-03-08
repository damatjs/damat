/**
 * Module Migrations
 *
 * Custom migration system that runs SQL migrations from each module's
 * migrations folder sequentially. This replaces Prisma's built-in
 * migration system to allow independent module management.
 *
 * IMPORTANT: Do NOT use 'prisma migrate' commands - they will conflict
 * with this system.
 *
 * Commands:
 *   npm run db:migrate           - Run all pending migrations
 *   npm run db:migrate:status    - Show migration status
 *   npm run db:migrate:create    - Create a new migration
 *
 * @see docs/MIGRATIONS.md for full documentation
 */

// Re-export from @damatjs/utils/dal
export * from "@damatjs/utils/dal";
