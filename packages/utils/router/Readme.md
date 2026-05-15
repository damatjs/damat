# File-based Router

## Overview

A Next.js-style file-based router for Hono located in `packages/utils/src/router/`. It provides automatic route discovery based on filesystem structure.

## File Structure

```
packages/utils/src/router/
├── index.ts      # Re-exports all modules
├── types.ts      # Type definitions
├── scanner.ts    # Directory scanning utilities
├── builder.ts    # Router factory (createFileRouter)
├── helpers.ts    # Route definition helpers
└── response.ts   # Response utilities
```

## Folder Structure Convention

```
api/routes/
├── teams/
│   ├── route.ts              -> /teams (GET, POST)
│   └── [teamId]/
│       ├── route.ts          -> /teams/:teamId (GET, PATCH, DELETE)
│       └── members/
│           └── route.ts      -> /teams/:teamId/members (GET, POST)
└── users/
    └── [...slug]/
        └── route.ts          -> /users/* (catch-all)
```

### Path Conversion

| Folder Pattern | URL Pattern | Description       |
| -------------- | ----------- | ----------------- |
| `[param]`      | `:param`    | Dynamic segment   |
| `[...param]`   | `*`         | Catch-all segment |

## Setup & Usage

### 1. Create the Router

```typescript
import { createFileRouter } from "@damatjs/utils";
import { logger } from "./logger";

const { router, routes, getRouteList } = await createFileRouter({
  routesDir: "./src/routes",
  basePath: "/api/v1",
  globalMiddleware: [authMiddleware],
  debug: true,
  logger,
});

// Mount to your Hono app
app.route("/", router);

// Log registered routes
console.log(getRouteList());
```

### 2. Define Route Files

Each `route.ts` exports HTTP method handlers:

```typescript
// routes/teams/route.ts
import { response, defineRoute } from "@damatjs/utils";
import type { RouteHandler, RouteConfig } from "@damatjs/utils";

// Optional config
export const config: RouteConfig = {
  auth: "session",
  rateLimit: { requests: 100, window: "1m" },
};

// Optional middleware for this route
export const middleware = [someMiddleware];

// GET /teams
export const GET: RouteHandler = async (c) => {
  const teams = await getTeams();
  return response.json(c, teams);
};

// POST /teams
export const POST: RouteHandler = async (c) => {
  const body = await c.req.json();
  const team = await createTeam(body);
  return response.created(c, team);
};
```

### 3. Dynamic Route Parameters

```typescript
// routes/teams/[teamId]/route.ts
import { defineRoute, response } from "@damatjs/utils";

// GET /teams/:teamId
export const GET = defineRoute<{ teamId: string }>(async (c, params) => {
  const team = await getTeam(params.teamId);
  return response.json(c, team);
});

// DELETE /teams/:teamId
export const DELETE = defineRoute<{ teamId: string }>(async (c, params) => {
  await deleteTeam(params.teamId);
  return response.noContent(c);
});
```

## API Reference

### `createFileRouter(options): Promise<FileRouter>`

Creates a file-based router.

**Options:**

| Option             | Type                  | Required | Description                                |
| ------------------ | --------------------- | -------- | ------------------------------------------ |
| `routesDir`        | `string`              | Yes      | Directory containing route files           |
| `basePath`         | `string`              | No       | Base path for all routes (e.g., `/api/v1`) |
| `globalMiddleware` | `MiddlewareHandler[]` | No       | Middleware applied to all routes           |
| `debug`            | `boolean`             | No       | Enable debug logging                       |
| `logger`           | `Logger`              | Yes      | Logger instance                            |

**Returns:**

```typescript
interface FileRouter {
  router: Hono;
  routes: RegisteredRoute[];
  getRouteList(): string;
  getRoutesJson(): Array<{ method: string; path: string }>;
}
```

### `defineRoute<P>(handler): RouteHandler`

Helper to create handlers with typed params.

```typescript
export const GET = defineRoute<{ id: string }>(async (c, params) => {
  // params.id is typed as string
});
```

### `response` Helpers

| Method                                      | Description                   |
| ------------------------------------------- | ----------------------------- |
| `response.json(c, data, status?)`           | JSON response (default 200)   |
| `response.created(c, data)`                 | JSON response with 201 status |
| `response.noContent(c)`                     | Empty 204 response            |
| `response.error(c, message, code, status?)` | Error response                |

**Response Format:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req-123",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Types

```typescript
type RouteHandler = (c: Context) => Promise<Response> | Response;

interface RouteModule {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  PATCH?: RouteHandler;
  DELETE?: RouteHandler;
  middleware?: MiddlewareHandler[];
  config?: RouteConfig;
}

interface RouteConfig {
  rateLimit?: { requests: number; window: string };
  auth?: "session" | "apiKey" | "flexible" | "none";
}

interface RegisteredRoute {
  method: string;
  path: string;
  filePath: string;
  hasMiddleware: boolean;
}
```

## Route Priority

Routes are automatically sorted so static routes take precedence over dynamic ones:

1. `/teams/invitations` (static)
2. `/teams/:teamId` (dynamic)
3. `/teams/*` (catch-all)
