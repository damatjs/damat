import type { Hono } from "@damatjs/deps/hono";
import type { ModuleManifest } from "../manifest/types";
import type { ModuleRuntimeCapabilities } from "./capabilities";

export type { ModuleRuntimeCapabilities } from "./capabilities";

/** Structural handle for the underlying node server (matches @hono/node-server) */
export interface ModuleServerHandle {
  close(callback?: (err?: Error) => void): void;
  once?(event: "error", listener: (error: Error) => void): unknown;
}

export interface StartModuleAppOptions {
  /** Module package root (contains package.json / module.config.ts). Default: cwd */
  packageDir?: string;
  /** Port override. Default: PORT env, module.config, then 7654. Use 0 for a random port. */
  port?: number;
}

export interface RunningModuleApp {
  /** The Hono app — useful for direct fetch-style testing */
  app: Hono;
  /** The node server handle */
  server: ModuleServerHandle;
  /** The port actually bound (resolved when port 0 was requested) */
  port: number;
  /** The module's manifest */
  manifest: ModuleManifest;
  /** Capabilities enabled by the standalone development host. */
  capabilities: ModuleRuntimeCapabilities;
  /** HTTP base path under which the module's routes are mounted. */
  routeBasePath: string;
  /** Stop the server and run all shutdown handlers (db, redis, logger) */
  stop(): Promise<void>;
}
