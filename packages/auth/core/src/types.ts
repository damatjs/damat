import type { Context, MiddlewareHandler } from "@damatjs/deps/hono";

/**
 * The authenticated principal an adapter extracts from a verified request.
 * Structurally the framework's `AuthUser`, so it drops straight into
 * `c.get("user")`; `orgId` maps to `c.get("team")`.
 */
export interface AuthPrincipal {
  id: string;
  email?: string;
  /** Organization/tenant id, when the provider carries one → the request "team". */
  orgId?: string;
  [claim: string]: unknown;
}

/**
 * What every provider adapter implements. Adapters only READ requests and
 * VERIFY them — they never create or migrate schema. A provider that persists
 * (Better Auth) is told the table/column names via its own options and assumes
 * those tables already exist.
 */
export interface AuthProvider {
  /** Stable id (e.g. "better-auth", "clerk", "auth0"). */
  name: string;
  /** Verify a session/bearer request → the principal, or null when unauthenticated. */
  authenticate(c: Context): Promise<AuthPrincipal | null>;
  /** Optional API-key verification path (used for the `apiKey`/`flexible` auth types). */
  authenticateApiKey?(c: Context): Promise<AuthPrincipal | null>;
  /**
   * Provider-owned HTTP endpoints to mount (Better Auth's sign-in/session
   * handler). Hosted providers (Clerk, Auth0) omit this.
   */
  routes?: { basePath: string; handler: MiddlewareHandler };
  /** Release any provider resources on app shutdown. */
  shutdown?(): Promise<void>;
}

/** Fired once per verified request so the app can sync a local user row (opt-in). */
export type OnAuthenticated = (principal: AuthPrincipal, c: Context) => void | Promise<void>;

/**
 * The `services.auth` block of `damat.config.ts`. `provider` names the adapter
 * package the framework dynamically imports; `options` is passed to that
 * adapter's factory verbatim.
 */
export interface AuthServiceConfig {
  /** Which adapter to load: "better-auth" → @damatjs/auth-better-auth, etc. */
  provider: string;
  /** Provider-specific options (connection, keys, table names, …). */
  options?: Record<string, unknown>;
  /** Optional local-user sync hook, fired once per verified request. */
  onAuthenticated?: OnAuthenticated;
}

/** An adapter package's default export: build a provider from its options. */
export type AuthAdapterFactory = (
  options: Record<string, unknown>,
) => AuthProvider | Promise<AuthProvider>;
