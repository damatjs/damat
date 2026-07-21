import { assertAuthProvider, type AuthProvider } from "@damatjs/provider-auth";
import type { ILogger } from "@damatjs/logger";
import type { AppConfig } from "../config";
import type { AuthMiddlewareOptions } from "../middleware/auth";
import { createProviderAuthHandlers } from "./authHandlers";
import { getProvider } from "./providers";

export interface AuthRuntime {
  handlers: AuthMiddlewareOptions;
  provider: AuthProvider;
  module: string;
}

export function initAuth(
  config: AppConfig,
  logger: ILogger,
): AuthRuntime | null {
  const binding = config.providers?.auth;
  if (!binding) return null;
  const provider = getProvider<AuthProvider>("auth");
  if (!provider)
    throw new Error(
      `Auth provider binding for module "${binding.module}" was not initialized`,
    );
  assertAuthProvider(provider);
  logger.info("Authentication provider ready", { module: binding.module });
  return {
    handlers: createProviderAuthHandlers(provider, logger),
    provider,
    module: binding.module,
  };
}
