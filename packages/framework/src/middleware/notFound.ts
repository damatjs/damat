import type { Context } from "@damatjs/deps/hono";

export function notFoundHandler(c: Context): Response {
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "The requested endpoint does not exist",
      },
      meta: {
        requestId: c.get("requestId") || "unknown",
        timestamp: new Date().toISOString(),
      },
    },
    404,
  );
}
