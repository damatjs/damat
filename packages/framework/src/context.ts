import type { Context } from "@damatjs/deps/hono";
import type { ILogger } from "@damatjs/logger";

/**
 * The authenticated principal an app's auth middleware sets via
 * `c.set("user", ...)`. Apps may carry extra fields; the framework only
 * relies on `id`.
 */
export interface AuthUser {
  id: string;
  [key: string]: unknown;
}

/** The team/organization an app's auth middleware sets via `c.set("team", ...)`. */
export interface AuthTeam {
  id: string;
  [key: string]: unknown;
}

/**
 * Types for the request-scoped variables the framework (and app middleware)
 * put on the Hono context. Augmenting hono's ContextVariableMap types every
 * `c.get(...)`/`c.set(...)` in the app too — no `as` casts needed.
 *
 * `requestId`, `startTime` and `logger` are set by the framework's own
 * requestSetup middleware on every request; `user`/`team`/`userId` are set by
 * the app's auth middleware (when configured), so they stay optional.
 */
declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    startTime: number;
    logger: ILogger;
    user?: AuthUser;
    team?: AuthTeam;
    userId?: string;
  }
}

/**
 * The request-scoped child logger requestSetup created (carries requestId,
 * method, path). Named distinctly from services/logger's `getLogger()`, which
 * returns the process-global logger.
 */
export function getRequestLogger(c: Context): ILogger {
  return c.get("logger");
}

/** The authenticated user, when the app's auth middleware set one. */
export function getUser(c: Context): AuthUser | undefined {
  return c.get("user");
}

/** The authenticated team, when the app's auth middleware set one. */
export function getTeam(c: Context): AuthTeam | undefined {
  return c.get("team");
}
