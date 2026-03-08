import type { DatabaseConnection } from "../types";

// Singleton connection instance
export let connectionInstance: DatabaseConnection | null = null;

export function setConnectionInstance(
  connection: DatabaseConnection | null,
): void {
  connectionInstance = connection;
}
