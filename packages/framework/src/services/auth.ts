import type { Hono, MiddlewareHandler } from "@damatjs/deps/hono";
import type { ILogger } from "@damatjs/logger";
import { PoolManager } from "@damatjs/services";
import type { AppConfig } from "../config";
import type { AuthMiddlewareOptions } from "../middleware/auth";

/**
 * The built auth wiring: the session/apiKey/flexible handlers the router
 * consumes, an optional route-mount for provider-owned endpoints (Better
 * Auth), and an optional shutdown.
 */
export interface AuthRuntime {
  handlers: AuthMiddlewareOptions;
  mountRoutes?: (app: Hono) => void;
  shutdown?: () => Promise<void>;
}

/** Short provider name → adapter package (a value with "/" is used verbatim). */
function adapterPackage(provider: string): string {
  return provider.includes("/") ? provider : `@damatjs/auth-${provider}`;
}

/**
 * Build the auth runtime from `services.auth`, or null when auth isn't
 * configured. Dynamically imports the core (`@damatjs/auth`) and the named
 * adapter so an app without auth pulls in neither. Providers that persist
 * (Better Auth) receive the app's Postgres pool via `options.database` — they
 * use the existing tables and create nothing.
 */
export async function initAuth(
  config: AppConfig,
  logger: ILogger,
): Promise<AuthRuntime | null> {
  const authConfig = config.services?.auth;
  if (!authConfig) return null;

  const pkg = adapterPackage(authConfig.provider);
  let core: typeof import("@damatjs/auth");
  let adapter: { default?: (o: Record<string, unknown>) => unknown };
  try {
    core = (await import("@damatjs/auth")) as typeof import("@damatjs/auth");
    adapter = (await import(pkg)) as { default?: (o: Record<string, unknown>) => unknown };
  } catch (e) {
    throw new Error(
      `Auth provider "${authConfig.provider}" could not be loaded — install its packages ` +
        `(e.g. \`bun add ${pkg} @damatjs/auth\` plus the provider SDK). Original error: ` +
        (e instanceof Error ? e.message : String(e)),
    );
  }

  const factory = adapter.default;
  if (typeof factory !== "function") {
    throw new Error(`Auth adapter "${pkg}" has no default export (the provider factory)`);
  }

  // Inject the app's pool for providers that persist; harmless to the ones that
  // don't (they only read the options they know).
  const options: Record<string, unknown> = { ...authConfig.options };
  if (PoolManager.isInitialized() && options.database === undefined) {
    options.database = PoolManager.getPool();
  }

  const provider = await factory(options);
  const p = provider as {
    routes?: { basePath: string; handler: MiddlewareHandler };
    shutdown?: () => Promise<void>;
  };

  const { session, apiKey, flexible } = core.createAuthHandlers(
    provider as never,
    authConfig.onAuthenticated
      ? { onAuthenticated: authConfig.onAuthenticated as never }
      : {},
  );

  logger.info("Auth provider ready", { provider: authConfig.provider });

  return {
    handlers: { session, apiKey, flexible },
    ...(p.routes
      ? {
          mountRoutes: (app: Hono) => {
            // Mount the provider's endpoints (Better Auth sign-in/session)
            // before the file router so `${basePath}/*` is served, not 404'd.
            app.all(`${p.routes!.basePath}/*`, p.routes!.handler);
            app.all(p.routes!.basePath, p.routes!.handler);
          },
        }
      : {}),
    ...(p.shutdown ? { shutdown: () => p.shutdown!() } : {}),
  };
}
