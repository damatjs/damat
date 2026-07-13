import type { Context, MiddlewareHandler } from "@damatjs/deps/hono";
import { getLogger } from "@damatjs/logger";
import type { AuthPrincipal, AuthProvider, OnAuthenticated } from "./types";

/** The three handlers the framework's `createAuthMiddleware` selects from. */
export interface AuthHandlers {
  session: MiddlewareHandler;
  apiKey: MiddlewareHandler;
  flexible: MiddlewareHandler;
}

export interface AuthHandlersOptions {
  onAuthenticated?: OnAuthenticated;
}

/**
 * Build session / apiKey / flexible middleware from a provider. Each verifies
 * the request through the provider, and on success sets the request principal
 * (`c.set("user")`, plus `c.set("team")` / `c.set("userId")` when present),
 * fires the optional `onAuthenticated` hook, and continues; otherwise it
 * rejects with the framework's standard 401 envelope. `flexible` tries the
 * session path first, then the API-key path.
 */
export function createAuthHandlers(
  provider: AuthProvider,
  options: AuthHandlersOptions = {},
): AuthHandlers {
  const session = makeHandler(
    (c) => provider.authenticate(c),
    provider,
    options,
  );
  const apiKey = makeHandler(
    (c) =>
      (provider.authenticateApiKey ?? provider.authenticate).call(provider, c),
    provider,
    options,
  );
  const flexible = makeHandler(
    async (c) =>
      (await provider.authenticate(c)) ??
      (provider.authenticateApiKey ? provider.authenticateApiKey(c) : null),
    provider,
    options,
  );
  return { session, apiKey, flexible };
}

function makeHandler(
  verify: (c: Context) => Promise<AuthPrincipal | null>,
  provider: AuthProvider,
  options: AuthHandlersOptions,
): MiddlewareHandler {
  return async (c, next) => {
    let principal: AuthPrincipal | null;
    try {
      principal = await verify(c);
    } catch (e) {
      // A verification error is treated as unauthenticated (never a 500) — the
      // provider is external and a bad/expired token must not crash the request.
      getLogger().warn(`Auth provider "${provider.name}" verification failed`, {
        error: e instanceof Error ? e.message : String(e),
      });
      principal = null;
    }

    if (!principal) return unauthorized(c);

    setPrincipal(c, principal);
    if (options.onAuthenticated) {
      try {
        await options.onAuthenticated(principal, c);
      } catch (e) {
        // The user-sync hook must not fail an otherwise-authenticated request.
        getLogger().error(
          "onAuthenticated hook failed",
          e instanceof Error ? e : new Error(String(e)),
        );
      }
    }
    return next();
  };
}

/** Put the principal on the request context (typed for consumers by the framework's ContextVariableMap). */
export function setPrincipal(c: Context, principal: AuthPrincipal): void {
  // `as never` bypasses the base (empty) ContextVariableMap here; consumers get
  // the typed `c.get("user")` from @damatjs/framework's augmentation.
  c.set("user" as never, principal as never);
  c.set("userId" as never, principal.id as never);
  if (principal.orgId) c.set("team" as never, { id: principal.orgId } as never);
}

function unauthorized(c: Context): Response {
  return c.json(
    {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
      meta: {
        requestId: (c.get("requestId" as never) as string) || "unknown",
        timestamp: new Date().toISOString(),
      },
    },
    401,
  );
}
