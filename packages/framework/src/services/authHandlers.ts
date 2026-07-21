import {
  isApiKeyPrincipal,
  isAuthPrincipal,
  type AuthCredentials,
  type AuthPrincipal,
  type AuthProvider,
} from "@damatjs/provider-auth";
import type { Context, MiddlewareHandler } from "@damatjs/deps/hono";
import type { ILogger } from "@damatjs/logger";
import { unauthorized } from "../middleware/auth";
import type { AuthMiddlewareOptions } from "../middleware/auth";
import { normalizeAuthCredentials } from "./authCredentials";

type Verify = (credentials: AuthCredentials) => Promise<unknown>;
type Validator = (value: unknown) => value is AuthPrincipal;

export function createProviderAuthHandlers(
  provider: AuthProvider,
  logger: ILogger,
): AuthMiddlewareOptions {
  const session = (credentials: AuthCredentials) =>
    provider.authenticate(credentials);
  const apiKey = (credentials: AuthCredentials) =>
    provider.verifyApiKey(credentials);
  return {
    session: makeHandler(session, isAuthPrincipal, "authenticate", logger),
    apiKey: makeHandler(apiKey, isApiKeyPrincipal, "verifyApiKey", logger),
    flexible: makeHandler(
      async (credentials) =>
        (await safeVerify(
          session,
          credentials,
          isAuthPrincipal,
          "authenticate",
          logger,
        )) ??
        safeVerify(
          apiKey,
          credentials,
          isApiKeyPrincipal,
          "verifyApiKey",
          logger,
        ),
      isAuthPrincipal,
      "flexible",
      logger,
    ),
  };
}

function makeHandler(
  verify: Verify,
  validate: Validator,
  operation: string,
  logger: ILogger,
): MiddlewareHandler {
  return async (context, next) => {
    const credentials = normalizeAuthCredentials(context.req.raw.headers);
    const principal = await safeVerify(
      verify,
      credentials,
      validate,
      operation,
      logger,
    );
    if (!principal) return unauthorized(context);
    setPrincipal(context, principal);
    return next();
  };
}

async function safeVerify(
  verify: Verify,
  credentials: AuthCredentials,
  validate: Validator,
  operation: string,
  logger: ILogger,
): Promise<AuthPrincipal | null> {
  try {
    const result = await verify(credentials);
    if (result === null) return null;
    if (validate(result)) return result;
    logger.warn("Auth provider returned an invalid principal", { operation });
  } catch {
    logger.warn("Auth provider verification failed", { operation });
  }
  return null;
}

function setPrincipal(context: Context, principal: AuthPrincipal): void {
  context.set("user", principal as never);
  context.set("userId", principal.id);
  if (principal.orgId) context.set("team", { id: principal.orgId });
}
