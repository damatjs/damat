# Handlers (built-in routes)

Source: `src/handlers/` — `root.ts`, `apiRoutes.ts`, `health.ts`, `type.ts`.

## Responsibility

A small set of framework-provided routes mounted by `bootstrap` (separate from the file-based application routes). Each factory returns a fresh `Hono` sub-app that gets `app.route("", ...)`-mounted.

| Factory                                      | Mounted when                | Path                      | Purpose                                  |
| -------------------------------------------- | --------------------------- | ------------------------- | ---------------------------------------- |
| `createRootRoute(fileRouter)`                | `nodeEnv === "development"` | `GET /damat`              | API info / banner.                       |
| `createApiRoutesRoute(fileRouter)`           | `nodeEnv === "development"` | `GET /damat/api/routes`   | List all registered routes.              |
| `createHealthRoute(options?, entryPathUrl?)` | a `healthCheck` is provided | `GET /health` (or custom) | Liveness/health with per-service checks. |

## `createRootRoute(fileRouter)` (`root.ts`)

`GET /damat` returns a static info object:

```jsonc
{
  "name": "Damatjs Backend Infrustcutre",
  "version": "1.0.0",
  "description": "Backend Infrustcutre to build and not repeat.",
  "documentation": "https://docs.damatjs.com",
  "defaultEndpoints": {
    "GET /damat": "API information",
    "GET /health": "Health check",
    "GET /damat/api/routes": "List all registered routes",
  },
}
```

(It also builds a `routesByPath` map internally but does not currently include it in the response.)

## `createApiRoutesRoute(fileRouter)` (`apiRoutes.ts`)

`GET /damat/api/routes` returns the route list from the file router:

```jsonc
{ "success": true, "data": { "routes": [ { "method": "GET", "path": "/users" }, ... ], "count": 12 } }
```

`routes` comes from `fileRouter.getRoutesJson()`; `count` from `fileRouter.routes.length`.

## `createHealthRoute(options?, entryPathUrl?)` (`health.ts`)

```ts
interface HealthCheckFn {
  (): Promise<{ status: string; latency?: number }>;
}
interface HealthCheckOptions {
  checks?: { database?: HealthCheckFn; redis?: HealthCheckFn };
  version?: string;
}
```

`GET /health` (or `entryPathUrl` if provided):

1. Runs `checks.database()` and `checks.redis()` if present; a thrown check is recorded as `{ status: "unhealthy" }`.
2. `allHealthy` is true when every recorded check has status `"healthy"` **or** `"not configured"` (a never-configured service must not fail the overall health).
3. Returns `{ status: allHealthy ? "healthy" : "degraded", timestamp, version: options.version ?? "2.0.0", checks }` with status code `200` (healthy) or `503` (degraded).

The `checks` are supplied by `initializeServices` (`services/index.ts`): real DB/Redis pings when configured, `"not configured"` when not. `bootstrap` passes `{ version: "2.0.0", checks }`.

### Behaviour (from `tests/handlers/health.test.ts`)

- No checks → `200`, `status: "healthy"`.
- All checks healthy → `200`, echoes `{ status, latency }` per check.
- A throwing check → `503`, that check becomes `{ status: "unhealthy" }`.
- Any unhealthy check → `503`, `status: "degraded"`.
- `version` defaults to `"2.0.0"`, overridable.
- `timestamp` is a valid ISO string.

## Gotchas

- **Two `HealthCheckFn`/health-config shapes exist.** `handlers/type.ts` defines `HealthCheckFn`/`HealthCheckOptions` (no `data`), while `src/types.ts` defines `HealthCheckFn`/`HealthCheckConfig` (with `data`). `bootstrap`/`entry` use the `types.ts` shape; the health route accepts the structurally-compatible subset. Keep them in sync when editing.
- **Dev-only introspection.** `/damat` and `/damat/api/routes` are only mounted in development; do not depend on them in production deployments.
- **"not configured" counts as healthy.** This is intentional so optional services (e.g. Redis omitted) don't flip `/health` to degraded.
