import type { DbPoolConfig } from "@damatjs/orm-type";
import type { RedisConfig } from "../../services/redis";

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
  /**
   * Cross-process event broadcasting via Redis pub/sub (@damatjs/events).
   * Requires `projectConfig.redisUrl`. Local (in-process) events always work
   * without this — broadcast only adds delivery to OTHER processes.
   */
  events?: {
    broadcast?: boolean;
    /** Pub/sub channel (default "damat-events"). */
    channel?: string;
  };
  /**
   * Background job worker (@damatjs/jobs). Requires `projectConfig.redisUrl`.
   * Enqueueing works from any process; only processes with `worker: true`
   * execute jobs (they must import the code that `defineJob`s them — module
   * init does this for installed modules).
   */
  jobs?: {
    worker?: boolean;
    /** Queue to poll (default "damat-jobs"). */
    queueName?: string;
    /** Jobs processed simultaneously (default 1). */
    concurrency?: number;
    /** Idle wait between polls, ms (default 1000). */
    pollIntervalMs?: number;
  };
}
