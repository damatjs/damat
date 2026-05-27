import type { MiddlewareHandler } from "@damatjs/deps/hono";
import type { HttpRateLimitConfig, HttpAuthConfig } from "../../config";
import type { RouteHandler } from "./handlers";
import type { RouteValidator } from "./validation";
import type { HttpMethod } from "./http";

export type AuthType = "session" | "apiKey" | "flexible" | "none";

export interface RouteModuleConfig {
  method: HttpMethod;
  rateLimit?: HttpRateLimitConfig | false;
  auth?: HttpAuthConfig | false;
}

export interface RouteModule {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  PATCH?: RouteHandler;
  DELETE?: RouteHandler;
  middleware?: MiddlewareHandler[];
  validators?: RouteValidator[];
  config?: RouteModuleConfig;
  configs?: RouteModuleConfig[];
}
