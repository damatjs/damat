/**
 * DAL Module - Database Access Layer
 *
 * Provides database configuration, connection management, module registry,
 * and migration utilities.
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   defineDbModule,
 *   createDbConfig,
 *   initConnection,
 *   getConnection,
 *   runCli,
 * } from '@damatjs/utils/dal';
 *
 * // 1. Define modules in each feature
 * const userModule = defineDbModule({
 *   name: 'user',
 *   entities: [User, Account, Session],
 * });
 *
 * // 2. Create ORM config from modules
 * const ormConfig = createDbConfig(
 *   process.env.DATABASE_URL!,
 *   [userModule, billingModule],
 * );
 *
 * // 3. Initialize connection
 * await initConnection({
 *   database: { url: process.env.DATABASE_URL! },
 *   modules: [userModule, billingModule],
 * });
 *
 * // 4. Use anywhere
 * const connection = getConnection();
 * ```
 *
 * @see DAL.md for documentation
 */

// =============================================================================
// TYPES
// =============================================================================

export type * from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

export * from "./config";

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

export * from "./connection";

// =============================================================================
// MIGRATIONS
// =============================================================================

export * from "./migrations";
