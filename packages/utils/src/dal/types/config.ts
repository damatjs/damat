import type {
  Options,
} from "@damatjs/deps/mikro-orm/postgresql";
import { DatabaseModule } from './module';


// =============================================================================
// DATABASE CONFIG
// =============================================================================

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** PostgreSQL connection URL */
  url: string;
  /** Database name (extracted from URL if not provided) */
  dbName?: string;
  /** Enable debug logging (default: false in production) */
  debug?: boolean;
  /** Connection pool minimum size (default: 2) */
  poolMin?: number;
  /** Connection pool maximum size (default: 10) */
  poolMax?: number;
  /** Allow global entity manager context (default: true) */
  allowGlobalContext?: boolean;
}

/**
 * Full ORM configuration options
 */
export interface OrmConfig {
  /** Database connection configuration */
  database: DatabaseConfig;
  /** Registered modules with entities */
  modules: DatabaseModule[];
  /** Additional MikroORM options */
  options?: Partial<Options>;
}
