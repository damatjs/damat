import { MikroORM } from "@damatjs/deps/mikro-orm/postgresql";
import type { DatabaseConnection } from "../types";
import { connectionInstance } from "./singleton";

/**
 * Get the singleton database connection.
 * Throws if initConnection() has not been called.
 *
 * @returns Database connection instance
 */
export function getConnection(): DatabaseConnection {
  if (!connectionInstance) {
    throw new Error(
      "Database connection not initialized. Call initConnection() first.",
    );
  }
  return connectionInstance;
}

/**
 * Get the singleton connection's ORM instance.
 * Throws if initConnection() has not been called.
 *
 * @returns MikroORM instance
 */
export function getOrm(): MikroORM {
  return getConnection().orm;
}

/**
 * Get a forked EntityManager from the singleton connection.
 * Use this for request-scoped operations.
 *
 * @returns Forked EntityManager
 */
export function getEm() {
  return getConnection().fork();
}
