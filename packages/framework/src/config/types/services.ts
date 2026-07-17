import type { DbPoolConfig } from "@damatjs/orm-type";
import type { RedisConfig } from "../../services/redis";
import type { DurabilityServiceConfig } from "./durability";
import type { EventsServiceConfig } from "./events";
import type { JobsServiceConfig } from "./jobs";

/**
 * Authentication via a pluggable provider (Better Auth / Clerk / Auth0). Fully
 * optional: without this block no auth package is imported. The framework
 * dynamically loads the adapter named by `provider` only when this is set, so
 * apps that don't use auth depend on nothing.
 */
export interface AuthServiceConfig {
  /**
   * The adapter to load. A short name maps to `@damatjs/auth-<name>`
   * ("better-auth" → `@damatjs/auth-better-auth`); a value containing "/" is
   * treated as an explicit package name (custom adapters).
   */
  provider: "better-auth" | "clerk" | "auth0" | (string & {});
  /** Provider-specific options passed to the adapter's factory (keys, table names, …). */
  options?: Record<string, unknown>;
  /** Fired once per verified request — upsert a local user row via your own service (opt-in). */
  onAuthenticated?: (
    principal: { id: string; [claim: string]: unknown },
    c: unknown,
  ) => void | Promise<void>;
}

export interface ServicesConfig {
  redis?: RedisConfig;
  database?: DbPoolConfig;
  workflowLock?: boolean;
  /** Pluggable authentication provider — see {@link AuthServiceConfig}. Optional. */
  auth?: AuthServiceConfig;
  durability?: DurabilityServiceConfig;
  events?: EventsServiceConfig;
  jobs?: JobsServiceConfig;
}
