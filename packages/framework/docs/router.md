# Router (file-based routing)

Source: `src/router/` — `scanner/`, `builder.ts`, `helpers.ts`, `resolveMethodConfig.ts`, `response.ts`, `types/`.

## Responsibility

Turn a directory of `route.ts` files into a mounted Hono router. The router maps folder structure to URL paths, attaches per-route middleware, rate limiting, auth, and validation, and exposes introspection helpers.

`bootstrap` may also receive `routeProviders`. Each provider uses the same file
router and may set a `basePath`; packaged modules use `/<module-id>` so their
flat route tree matches the URL of a source install.

## File convention

- A route lives in a folder containing `route.ts` (or `route.js`). The folder path becomes the URL.
- Dynamic segments use brackets: `[userId]` → `:userId`; catch-all uses `[...rest]` → `*` (Hono wildcard).
- A `route.ts` module may export any of `GET`, `POST`, `PUT`, `PATCH`, `DELETE` (each a `RouteHandler`), plus optional `middleware`, `validators`, `config`, and `configs`.

```
src/api/routes/
  users/route.ts                 ->  /users           (GET, POST, ...)
  users/[userId]/route.ts        ->  /users/:userId
  auth/[...auth]/route.ts        ->  /auth/*
```

Mounted at the API base (default `/api`), so `/users` is served at `/api/users`.

## Scanner

### `folderToUrlPath(folderPath)` (`scanner/folderToUrlPath.ts`)

```ts
folderPath
  .replace(/\[\.\.\.([^\]]+)\]/g, "*") // [...rest] -> *
  .replace(/\[([^\]]+)\]/g, ":$1"); // [userId]  -> :userId
```

### `scanDirectory(dir, basePath?)` (`scanner/scanDirectory.ts`)

Recursively walks `dir`. For each subdirectory, recurses with the extended base path. For each `route.ts`/`route.js`, emits `{ urlPath, filePath }` where `urlPath = folderToUrlPath(basePath)` (defaulting to `/`, always leading-slashed). Returns `[]` if `dir` does not exist (guarded by `existsSync`).

### `sortRoutes(routes)` (`scanner/sortRoutes.ts`)

Returns a **new** sorted array (does not mutate). Ordering:

1. Static routes before dynamic (`:`/`*`).
2. Shallower paths (fewer `/` segments) before deeper.
3. Otherwise alphabetical by `urlPath`.

This guarantees Hono matches the most specific route. Catch-all (`*`) sorts last among same-depth peers.

## Builder

### `createFileRouter(options)` (`builder.ts`)

```ts
interface CreateFileRouterOptions extends FileRouterOptions {
  logger: Logger;
  rateLimit?: HttpRateLimitConfig;
  auth?: HttpAuthConfig;
}
interface FileRouterOptions {
  basePath?: string;
  routesDir: string;
  globalMiddleware?: MiddlewareHandler[];
  debug?: boolean;
}
```

Algorithm:

1. `new Hono()`. `scanDirectory(routesDir)` then `sortRoutes(...)`.
2. For each route file, dynamic-`import()` it as a `RouteModule`. **On import failure, log and rethrow** (startup aborts).
3. Compute `fullPath = basePath + (urlPath === "/" ? "" : urlPath)` (or `/`).
4. Register route-level middleware: `[...globalMiddleware, ...(module.middleware ?? [])]` via `router.use(fullPath, mw)`.
5. For each method in `["GET","POST","PUT","PATCH","DELETE"]` that the module exports:
   - `resolveMethodConfig(method, module.config, module.configs, globalRateLimit, globalAuth)` → `{ rateLimit?, auth?, globalRateLimit? }`.
   - If `rateLimit` resolved → `router.on(method, fullPath, createRateLimitMiddleware(rateLimit, globalRateLimit))`.
   - If `auth` resolved → `router.on(method, fullPath, createAuthMiddleware(auth.type))`.
   - If a `validators` entry matches the method → `router.on(method, fullPath, createValidatorMiddleware(validator))`. The validator runs before the handler, rejects invalid requests with a 400, and stores the parsed + coerced data for the handler to read with `getValidated`.
   - Finally `router.on(method, fullPath, handler)`.
   - Record a `RegisteredRoute` with flags (`hasMiddleware/hasValidator/hasRateLimit/hasAuth`); log it if `debug`.
6. Return a `FileRouter`:

```ts
interface FileRouter {
  router: Hono;
  routes: RegisteredRoute[];
  getRouteList(): string; // human-readable, grouped by path
  getRoutesJson(): Array<{ method: string; path: string }>;
}
```

> Middleware registration order per method: route-level `use` middleware, then (rate-limit, auth, validator), then the handler. Hono runs `use` middleware before `on` handlers for the matched path.

## Per-method config resolution

### `resolveMethodConfig(method, routeConfig, methodConfigs, globalRateLimit, globalAuth)` (`resolveMethodConfig.ts`)

Precedence, independently for `rateLimit` and `auth`:

1. **Method-level config** (`module.configs.find(c => c.method === method)`): if the field is `false` → explicitly disabled (left unset); if truthy → use it.
2. Else **route-level** (`module.config`): if truthy → use it.
3. Else **global** (from `http.rateLimit` / `http.auth`): if present → use it; for rate limit, also stash `globalRateLimit` so tiered lookups (`getUserTier`/`getApiKeyTier`) work.

```ts
interface RouteModuleConfig {
  method: HttpMethod;
  rateLimit?: HttpRateLimitConfig | false; // false => disable for this method
  auth?: HttpAuthConfig | false;
}
interface ResolvedConfig {
  rateLimit?: HttpRateLimitConfig;
  auth?: HttpAuthConfig;
  globalRateLimit?: HttpRateLimitConfig;
}
```

## Route module shape (`types/modules.ts`)

```ts
type AuthType = "session" | "apiKey" | "flexible" | "none";

interface RouteModule {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  PATCH?: RouteHandler;
  DELETE?: RouteHandler;
  middleware?: MiddlewareHandler[]; // applied to all methods on this path
  validators?: RouteValidator[]; // per-method validation
  config?: RouteModuleConfig; // route-level default
  configs?: RouteModuleConfig[]; // per-method overrides
}

type RouteHandler = (c: Context) => Promise<Response> | Response; // types/handlers.ts

interface RouteValidator {
  // types/validation.ts
  method: HttpMethod;
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  json?: ZodSchema;
}
```

## Helpers

### `defineRoute<P>(handler)` (`helpers.ts`)

```ts
export const GET = defineRoute<{ userId: string }>(async (c, params) => { ... });
```

Wraps a handler so route params are extracted (`c.req.param()`) and passed as a typed second argument. The result is a plain `RouteHandler`. (Exporting `GET = async (c) => ...` directly works too; `defineRoute` just adds typed params.)

### `getValidated<T>(c, target)` (`helpers.ts`)

```ts
const { id } = getValidated<ItemParams>(c, "params");
const data = getValidated<UpdateItem>(c, "body");
const query = getValidated<ItemQuery>(c, "query");
```

Reads the request data a route's `validators` already parsed and coerced for this method — the `body` / `query` / `params` / `json` exactly as the matching Zod schema produced it (query strings coerced to numbers/dates, etc.). `target` is one of `ValidationTarget = "body" | "query" | "params" | "json"`.

The validator middleware runs before the handler and rejects invalid requests with a 400, so inside the handler the returned value is already validated — no re-parsing and no manual presence checks. Targets the route declares no validator for return `undefined`. Backing store: the middleware writes the parsed data to the `"validated"` context variable; `getValidated` is the typed reader.

### `response` (`response.ts`)

The standard envelope helpers (used inside handlers):

| Helper                                         | Output                                                    |
| ---------------------------------------------- | --------------------------------------------------------- |
| `response.json(c, data, status=200)`           | `{ success: true, data, meta: { requestId, timestamp } }` |
| `response.created(c, data)`                    | `json(c, data, 201)`                                      |
| `response.noContent(c)`                        | `c.body(null, 204)`                                       |
| `response.error(c, message, code, status=400)` | `{ success: false, error: { code, message }, meta }`      |

`meta.requestId` is read from `c.get("requestId")` (set by `requestSetup`).

## Gotchas

- **Only the 5 verbs are wired.** `OPTIONS`/`HEAD` are not registered from route modules (CORS handles `OPTIONS` preflight at the middleware layer). There is a TODO in `scanDirectory` about a future verb-aware system.
- **Catch-all is Hono `*`, not a named splat.** `[...auth]` becomes `*`; read it via Hono's wildcard param conventions.
- **Import failure aborts startup.** A throwing `route.ts` (e.g. a top-level error) fails the whole boot — by design, to avoid silently missing routes.
- **`getRouteList()` returns a literal `\n`-joined string** (the code uses the escaped `"\\n"`), so it logs as a single line with visible `\n` separators rather than real newlines — cosmetic, dev-only.
- **Path collisions follow Hono semantics.** Two files mapping to the same `urlPath`+method both register; sorting controls match order but duplicates are not de-duplicated.
