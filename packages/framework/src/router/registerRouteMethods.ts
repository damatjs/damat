import type { Hono } from "@damatjs/deps/hono";
import { relative } from "node:path";
import { createAuthMiddleware } from "../middleware/auth";
import { createRateLimitMiddleware } from "../middleware/rateLimit";
import { createValidatorMiddleware } from "../middleware/validator";
import { resolveMethodConfig } from "./resolveMethodConfig";
import type {
  CreateFileRouterOptions,
  HttpMethod,
  RegisteredRoute,
  RouteModule,
} from "./types";

interface RegistrationInput {
  router: Hono;
  module: RouteModule;
  fullPath: string;
  filePath: string;
  middlewareCount: number;
  options: CreateFileRouterOptions;
  registeredRoutes: RegisteredRoute[];
}

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function registerRouteMethods(input: RegistrationInput): void {
  for (const method of METHODS) registerMethod(input, method);
}

function registerMethod(input: RegistrationInput, method: HttpMethod): void {
  const { router, module, fullPath, options } = input;
  const handler = module[method];
  if (!handler) return;
  const config = resolveMethodConfig(
    method,
    module.config,
    module.configs,
    options.rateLimit,
    options.auth,
  );
  let hasMethodMiddleware = false;
  if (config.rateLimit) {
    router.on(
      method,
      fullPath,
      createRateLimitMiddleware(config.rateLimit, config.globalRateLimit),
    );
    hasMethodMiddleware = true;
  }
  if (config.auth) {
    router.on(
      method,
      fullPath,
      createAuthMiddleware(config.auth.type, options.authHandlers),
    );
    hasMethodMiddleware = true;
  }
  const validator = module.validators?.find((item) => item.method === method);
  if (validator) {
    router.on(method, fullPath, createValidatorMiddleware(validator));
    hasMethodMiddleware = true;
  }
  router.on(method, fullPath, handler);
  recordRoute(input, method, hasMethodMiddleware, Boolean(validator), config);
}

function recordRoute(
  input: RegistrationInput,
  method: HttpMethod,
  hasMethodMiddleware: boolean,
  hasValidator: boolean,
  config: ReturnType<typeof resolveMethodConfig>,
): void {
  const filePath = relative(input.options.routesDir, input.filePath);
  input.registeredRoutes.push({
    method,
    path: input.fullPath,
    filePath,
    hasMiddleware: input.middlewareCount > 0 || hasMethodMiddleware,
    hasValidator,
    hasRateLimit: Boolean(config.rateLimit),
    hasAuth: Boolean(config.auth),
  });
  if (input.options.debug)
    input.options.logger.info(`Registered route: ${method} ${input.fullPath}`, {
      file: filePath,
      hasValidator,
      hasRateLimit: Boolean(config.rateLimit),
      hasAuth: Boolean(config.auth),
    });
}
