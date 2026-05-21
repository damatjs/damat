import { ConnectionManager } from "@damatjs/orm-pg";
import { ModuleServiceBase } from "@damatjs/services";
import type { Pool } from "@damatjs/deps/pg";
import type { ModuleConfig } from "../types";

let connectionManager: ConnectionManager | null = null;

export async function initDatabase(dbUrl: string): Promise<Pool> {
  connectionManager = new ConnectionManager(dbUrl);
  const pool = await connectionManager.connect();
  ModuleServiceBase.init(pool);
  return pool;
}

// TODO: not seeing the aim or usefulness of this Will need to remove or update
export async function loadModules(modules: ModuleConfig[]): Promise<void> {
  for (const mod of modules) {
    const moduleExports = await import(mod.resolve);
    if (moduleExports.default && typeof moduleExports.default === "function") {
      const ServiceClass = moduleExports.default;
      new ServiceClass();
    }
  }
}

// TODO: we are moving away from the orm-pg base pool setup so this and the close need a redo
export function getConnectionManager(): ConnectionManager | null {
  return connectionManager;
}

export async function closeDatabase(): Promise<void> {
  if (connectionManager) {
    await connectionManager.disconnect();
    connectionManager = null;
  }
}
