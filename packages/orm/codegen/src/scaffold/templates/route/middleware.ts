

export function routeMiddleware(): string {
  return `import type { MiddlewareHandler } from "@damatjs/deps/hono";

// Add route middleware (auth, rate-limit, etc.) here.
export const middleware: MiddlewareHandler[] = [];
`;
}
