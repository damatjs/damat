import type { ConnectionManager } from "@damatjs/orm-connector";
import type { Pool, DbPoolConfigWithExtras } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import type { ModuleManifest } from "../manifest/types";

/**
 * Structural contract for anything bootable by the harness — matches what
 * defineModule() returns, without binding to a specific @damatjs/services
 * version.
 */
export interface BootableModule<TService> {
  readonly name: string;
  readonly service: TService;
  init(): unknown;
}

export interface BootModuleOptions {
  /** Postgres connection string. Default: process.env.DATABASE_URL */
  databaseUrl?: string;
  /** Full pool config — takes precedence over databaseUrl */
  database?: DbPoolConfigWithExtras;
  /**
   * Absolute path to the module directory (containing damat.json and
   * migrations). Enables migration running and manifest reporting.
   */
  moduleDir?: string;
  /** Apply the module's migrations on boot. Default: true when moduleDir is set */
  migrate?: boolean;
  logger?: ILogger;
}

export interface BootedModule<TService> {
  /** The initialized module service — call your models/methods on it */
  service: TService;
  pool: Pool;
  connection: ConnectionManager;
  /** Parsed module manifest, when moduleDir was provided. */
  manifest: ModuleManifest | null;
  /** Close the database and reset shared state. Always call when done. */
  teardown(): Promise<void>;
}
