import { betterAuth } from "better-auth";
import type { Context, MiddlewareHandler } from "@damatjs/deps/hono";
import { defineAuthAdapter, type AuthPrincipal, type AuthProvider } from "@damatjs/auth";

/**
 * The slice of a Better Auth instance this adapter uses. Kept structural so the
 * adapter isn't pinned to one Better Auth version's exact types.
 */
export interface BetterAuthLike {
  handler: (req: Request) => Promise<Response>;
  api: {
    getSession: (args: {
      headers: Headers;
    }) => Promise<{ user: BetterAuthUser } | null>;
  };
}

interface BetterAuthUser {
  id: string;
  email?: string;
  name?: string;
  [claim: string]: unknown;
}

/** Table (model) name overrides — must match the tables the storage module created. */
export interface BetterAuthTables {
  user?: string;
  session?: string;
  account?: string;
  verification?: string;
}

export interface BetterAuthAdapterOptions {
  /**
   * A pre-built Better Auth instance (the escape hatch for full control:
   * plugins, social providers, custom fields). When given, all the build
   * options below are ignored.
   */
  auth?: BetterAuthLike;

  /** Where Better Auth's endpoints mount (default `/api/auth`). */
  basePath?: string;
  /** Signing secret (falls back to `process.env.BETTER_AUTH_SECRET`). */
  secret?: string;
  /** Public base URL (falls back to `process.env.BETTER_AUTH_URL`). */
  baseURL?: string;
  /**
   * The database Better Auth reads/writes — a `pg` Pool (the framework injects
   * the app's pool). Better Auth uses the EXISTING tables named by `tables`; it
   * never migrates here (the storage module owns the schema).
   */
  database?: unknown;
  /** Enable the built-in email + password flow (default true). */
  emailAndPassword?: boolean;
  /** Names of the existing tables the storage module created (defaults shown). */
  tables?: BetterAuthTables;
}

const DEFAULT_BASE_PATH = "/api/auth";

/**
 * Build the Better Auth {@link AuthProvider} for Damat. Better Auth runs *in*
 * the backend: it mounts its own sign-in / session endpoints at `basePath`, and
 * `authenticate` verifies the session cookie via `getSession`. It reads and
 * writes only the tables it is told about — it creates none.
 */
export function createBetterAuthProvider(options: BetterAuthAdapterOptions = {}): AuthProvider {
  const basePath = options.basePath ?? DEFAULT_BASE_PATH;
  const auth = options.auth ?? buildBetterAuth(options, basePath);

  const handler: MiddlewareHandler = (c) => auth.handler(c.req.raw);

  return {
    name: "better-auth",
    authenticate: async (c: Context) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      return session ? toPrincipal(session.user) : null;
    },
    routes: { basePath, handler },
  };
}

/** Construct a Better Auth instance from the adapter options + table map. */
function buildBetterAuth(options: BetterAuthAdapterOptions, basePath: string): BetterAuthLike {
  const secret = options.secret ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Better Auth requires a secret — set BETTER_AUTH_SECRET or pass options.secret",
    );
  }
  return betterAuth({
    secret,
    baseURL: options.baseURL ?? process.env.BETTER_AUTH_URL,
    basePath,
    database: options.database,
    emailAndPassword: { enabled: options.emailAndPassword ?? true },
    ...modelConfig(options.tables),
  } as never) as unknown as BetterAuthLike;
}

/** Translate the `tables` map into Better Auth's per-model `modelName` overrides. */
function modelConfig(tables?: BetterAuthTables): Record<string, { modelName: string }> {
  if (!tables) return {};
  const config: Record<string, { modelName: string }> = {};
  if (tables.user) config.user = { modelName: tables.user };
  if (tables.session) config.session = { modelName: tables.session };
  if (tables.account) config.account = { modelName: tables.account };
  if (tables.verification) config.verification = { modelName: tables.verification };
  return config;
}

function toPrincipal(user: BetterAuthUser): AuthPrincipal {
  const { id, email, ...rest } = user;
  return { id, ...(email !== undefined ? { email } : {}), ...rest };
}

/** The adapter's default export is the factory the framework dynamically imports. */
export default defineAuthAdapter(createBetterAuthProvider);
