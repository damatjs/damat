import type {
  MikroORM,
  EntityManager,
} from "@damatjs/deps/mikro-orm/postgresql";

// =============================================================================
// CONNECTION
// =============================================================================

/**
 * Database connection instance
 */
export interface DatabaseConnection {
  /** MikroORM instance */
  orm: MikroORM;
  /** Entity manager */
  em: EntityManager;
  /** Close the connection */
  close: () => Promise<void>;
  /** Check if connected */
  isConnected: () => Promise<boolean>;
  /** Fork entity manager for a request */
  fork: () => EntityManager;
}
