import { HttpAuthConfig, HttpRateLimitConfig } from '../config';
import type {
  HttpMethod,
  RouteModuleConfig,
  ResolvedConfig,
} from "./types";

export function resolveMethodConfig(
  method: HttpMethod,
  routeConfig: RouteModuleConfig | undefined,
  methodConfigs: RouteModuleConfig[] | undefined,
  globalRateLimit: HttpRateLimitConfig | undefined,
  globalAuth: HttpAuthConfig | undefined
): ResolvedConfig {
  const methodConfig = methodConfigs?.find(c => c.method === method);
  const result: ResolvedConfig = {};

  if (methodConfig?.rateLimit === false) {
    // Explicitly disabled
  } else if (methodConfig?.rateLimit) {
    result.rateLimit = methodConfig.rateLimit;
  } else if (routeConfig?.rateLimit) {
    result.rateLimit = routeConfig.rateLimit;
  } else if (globalRateLimit) {
    result.rateLimit = { requests: globalRateLimit.requests, window: globalRateLimit.window };
    result.globalRateLimit = globalRateLimit;
  }

  if (methodConfig?.auth === false) {
    // Explicitly disabled
  } else if (methodConfig?.auth) {
    result.auth = methodConfig.auth;
  } else if (routeConfig?.auth) {
    result.auth = routeConfig.auth;
  } else if (globalAuth) {
    result.auth = { type: globalAuth.type };
  }

  return result;
}
