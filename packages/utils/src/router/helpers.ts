import type { Context } from "@damatjs/deps/hono";
import type { RouteHandler } from "./types";

/**
 * Helper to create a route handler with typed params
 */
export function defineRoute<
  P extends Record<string, string> = Record<string, string>,
>(
  handler: (c: Context, params: P) => Promise<Response> | Response,
): RouteHandler {
  return async (c: Context) => {
    const params = c.req.param() as P;
    return handler(c, params);
  };
}
