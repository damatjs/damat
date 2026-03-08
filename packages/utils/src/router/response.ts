import type { Context } from "@damatjs/deps/hono";
import type { ContentfulStatusCode } from "@damatjs/deps/hono";

/**
 * Type-safe response helpers
 */
export const response = {
  json<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
    return c.json(
      {
        success: true,
        data,
        meta: {
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
      },
      status,
    );
  },

  created<T>(c: Context, data: T) {
    return response.json(c, data, 201);
  },

  noContent(c: Context) {
    return c.body(null, 204);
  },

  error(
    c: Context,
    message: string,
    code: string,
    status: ContentfulStatusCode = 400,
  ) {
    return c.json(
      {
        success: false,
        error: {
          code,
          message,
        },
        meta: {
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
      },
      status,
    );
  },
};
