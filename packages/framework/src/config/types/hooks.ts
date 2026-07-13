import type { Hono } from "@damatjs/deps/hono";
import type { ILogger } from "@damatjs/logger";
import type { ProjectConfig } from "./project";

/** What a lifecycle hook receives. `app` is only present around route setup. */
export interface LifecycleHookContext {
  config: ProjectConfig;
  logger: ILogger;
  /** The Hono app — set for beforeRoutes/afterRoutes, absent around service init. */
  app?: Hono;
}

export type LifecycleHook = (ctx: LifecycleHookContext) => void | Promise<void>;

/**
 * Optional bootstrap lifecycle hooks, configured in damat.config.ts. Each is
 * awaited at its stage; a hook that throws fails startup loudly (a broken
 * hook must never boot a half-configured server).
 *
 *   beforeServices — after config load, before logger/db/redis/module init
 *   afterServices  — services are up, routes not yet built
 *   beforeRoutes   — the Hono app exists, no routes registered yet
 *   afterRoutes    — all routes registered, just before the 404 handler
 */
export interface LifecycleHooks {
  beforeServices?: LifecycleHook;
  afterServices?: LifecycleHook;
  beforeRoutes?: LifecycleHook;
  afterRoutes?: LifecycleHook;
}
