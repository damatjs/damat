# Middleware

Source: `src/middleware/` — `setup.ts`, `requestSetup.ts`, `corsConfig.ts`, `error/`, `notFound.ts`, `rateLimit.ts`, `auth.ts`, `validator.ts`.

## Responsibility

Two kinds of middleware:

- **Global** — installed once on the app by `setupMiddleware` (security headers, timing, request setup, CORS, error wrapper).
- **Per-route** — factories the router attaches to specific methods (rate limit, auth, validator). Plus the app-level `notFoundHandler`.

## Global stack — `setupMiddleware` (`setup.ts`)

```ts
setupMiddleware({ app, logger, corsConfig });
```

Installs, in order, on `"*"`:

1. `secureHeaders()` — Hono security headers.
2. `timing()` — Server-Timing support.
3. `requestSetup` — per-request context (see below).
4. `cors(corsConfigSetter(corsConfig))` — CORS.
5. `errorHandler(logger)` — try/catch wrapper around `next()`.

Order matters: `requestSetup` runs before `errorHandler` so a `requestId` exists when errors are formatted. `errorHandler` wraps the downstream middleware chain — but **not** route-handler throws: in Hono v4 an error thrown from a handler is dispatched straight to `app.onError` and never unwinds through middleware, which is why `bootstrap` also installs `app.onError` against the same `handleError` (see [bootstrap.md](./bootstrap.md)).

## `requestSetup` (`requestSetup.ts`)

For each request:

- Sets `c.set("requestId", nanoid(12))` and `c.set("startTime", Date.now())`.
- Builds a child logger bound to `{ requestId, method, path }`, stored at `c.set("logger", ...)`, and logs `"Request started"` (user-agent, ip, query).
- `await next()`.
- After the response: computes duration, reads `c.res.status`, and calls `logger.request({ requestId, method, path, status, duration, identifier: [userId, teamId] })`.
- Sets `X-Request-ID` and `X-Response-Time` response headers.

`userId`/`teamId` for the request log are read from `c.get("user")?.id` / `c.get("team")?.id` (set by app auth middleware if present; default to `"anonymous"`/`"none"`).

## Typed context — `src/context.ts`

The variables `requestSetup` (and app auth middleware) put on the Hono context are typed via a `ContextVariableMap` augmentation, so `c.get(...)`/`c.set(...)` are fully typed in app code with no `as` casts:

```ts
declare module "hono" {
  interface ContextVariableMap {
    requestId: string;      // set by requestSetup
    startTime: number;      // set by requestSetup
    logger: ILogger;        // set by requestSetup (request-scoped child logger)
    user?: AuthUser;        // set by the app's auth middleware, so optional
    team?: AuthTeam;
    userId?: string;
  }
}
```

`AuthUser`/`AuthTeam` are `{ id: string; [key: string]: unknown }` — apps may carry extra fields; the framework only relies on `id`. Typed accessors (exported from the barrel):

- `getRequestLogger(c)` — the request-scoped child logger `requestSetup` created (carries `requestId`, `method`, `path`); distinct from `getLogger()`, which returns the process-global logger.
- `getUser(c)` / `getTeam(c)` — the authenticated user/team, `undefined` unless the app's auth middleware set one.

## CORS — `corsConfigSetter` (`corsConfig.ts`)

```ts
function corsConfigSetter(config?: string | CorsConfigType): CorsConfigType
```

- `undefined` or `"*"` → permissive defaults (`origin: "*"`).
- a string with commas → `origin: config.split(",")` (allowlist).
- a full `CorsConfigType` object → used as-is.

Defaults when given a string/empty: methods `GET,POST,PUT,PATCH,DELETE,OPTIONS`; headers `Content-Type, Authorization, X-API-Key, X-Request-ID`; expose `X-Request-ID, X-Response-Time, Retry-After`; `credentials: true`; `maxAge: 86400`.

```ts
interface CorsConfigType {
  origin: string | string[];
  allowMethods: ("GET"|"POST"|"PUT"|"PATCH"|"DELETE"|"OPTIONS")[];
  allowHeaders: string[]; exposeHeaders: string[];
  credentials: boolean; maxAge: number;
}
```

## Error handling — `error/`

### `errorHandler(logger)` (`error/index.ts`)

```ts
const errorHandler = (logger) => async (c, next) => {
  try { await next(); } catch (error) { return handleError(c, error, logger); }
};
```

Catches errors thrown by downstream **middleware**. Handler-thrown errors are handled by the `app.onError((err, c) => handleError(c, err, logger))` hook that `bootstrap` installs — same `handleError`, different entry point.

### `handleError(c, error, logger)` (`error/handleError.ts`)

Maps an error to the standard error envelope and logs it. `parseError` classifies:

| Error | status | code | message / details |
| --- | --- | --- | --- |
| `AppError` (from `@damatjs/types`) | `error.statusCode` | `error.code` | `error.message` / `error.details` |
| `ZodError` | 400 | `VALIDATION_ERROR` | "Request validation failed" / mapped issues (`path`, `message`) |
| `HTTPException` (Hono) | `error.status` | `getErrorCodeFromStatus(status)` | `error.message` |
| other `Error` | 500 | `INTERNAL_ERROR` | generic; in `NODE_ENV=development`, the real message + stack are included |

Response: `{ success: false, error: { code, message, details }, meta: { requestId, timestamp } }`.

### `getErrorCodeFromStatus(status)` (`error/code.ts`)

Maps common HTTP status codes to string codes (`400→BAD_REQUEST`, `401→UNAUTHORIZED`, `404→NOT_FOUND`, `429→RATE_LIMITED`, `500→INTERNAL_ERROR`, ... default `UNKNOWN_ERROR`).

## Not found — `notFoundHandler` (`notFound.ts`)

App-level (`app.notFound(...)`). Returns 404 with `{ success:false, error:{ code:"NOT_FOUND", message }, meta:{ requestId, timestamp } }`.

## Rate limit — `createRateLimitMiddleware(config, globalConfig?)` (`rateLimit.ts`)

Per-method, attached by the router when rate limiting is resolved. Behaviour:

1. If `!hasRedis()` → warn and pass through (rate limiting requires Redis).
2. Build an identifier: `apikey:<x-api-key>` if present, else `user:<userId>` (from `c.get("userId")`), else `ip:<first x-forwarded-for>` (or `"unknown"`).
3. Tiered override: if `userId` + `globalConfig.getUserTier` → use that tier; if `apiKey` + `globalConfig.getApiKeyTier` → use that tier (errors are logged, not fatal).
4. `windowMs = parseWindowToMs(window)`; `key = ratelimit:<identifier>:<path>`.
5. `checkRateLimit(key, windowMs, requests, redis)` (from `@damatjs/redis`, sliding-window via sorted sets).
6. Sets `X-RateLimit-Limit/Remaining/Reset`. If not allowed → `Retry-After` header + 429 envelope (`RATE_LIMIT_EXCEEDED` with `retryAfter`/`limit`/`window` details).
7. On any error in the check → log it, then: if `failClosed` is set (on the effective config, falling back to the route/method config) → 503 envelope (`RATE_LIMIT_UNAVAILABLE`); otherwise pass through (fail-open, the default).

Window format (`utils/windowParser.ts`): `^(\d+)(s|m|h|d)$` → ms. Invalid formats throw.

## Auth — `createAuthMiddleware(type, options?)` (`auth.ts`)

```ts
type AuthType = "session" | "apiKey" | "flexible" | "none";
interface AuthMiddlewareOptions { session?: MiddlewareHandler; apiKey?: MiddlewareHandler; flexible?: MiddlewareHandler; }
```

- `type === "none"` → `next()`.
- If a custom handler for `type` is supplied in `options` → delegate to it.
- Otherwise → **fail closed**: log an error naming the route and auth type, and return a 401 `UNAUTHORIZED` envelope. The framework does **not** ship a built-in session/apiKey verifier; apps provide one (the default backend has its own auth middleware under `src/api/middleware`). A route that declares auth is never served unauthenticated by mistake.

## Validation — `createValidatorMiddleware(validator)` & `validate` (`validator.ts`)

`createValidatorMiddleware(validator: RouteValidator)`:

- For `GET`/`DELETE`, collects `{ query, params }`; for others, attempts `c.req.json()` for `body` (falls back to query+params if no JSON body).
- For each present schema (`body`/`query`/`params`/`json`), requires the corresponding data (else a custom `ZodError` "X is required") and `.parse()`s it, keeping the parsed + coerced result.
- Stores the parsed results on the `"validated"` context variable, so handlers read validated + coerced input with `getValidated(c, target)` instead of re-parsing or re-checking it (and `json` is also exposed via Hono's `c.req.valid("json")`).
- On `ZodError` → returns a 400 `VALIDATION_ERROR` envelope with mapped `details` (`{ path, message }`). Other errors rethrow (caught by `errorHandler`).

`validate(schema, data)` is a standalone helper: `schema.parse(data)`, converting a `ZodError` into a `ValidationError` (from `@damatjs/types`). Use it inside handlers for ad-hoc validation.

## Index exports (`middleware/index.ts`)

Re-exports `corsConfig`, `error`, `notFound`, `requestSetup`, `setup`, `rateLimit`, `auth`. (`validator` is exported via the router barrel / used internally by the builder.)

## Gotchas

- **Rate limiting is a no-op without Redis; auth is not.** No Redis → rate limit passes through (fail-open). No app-provided auth handler → any non-`none` auth type returns 401 (fail-closed), so a misconfigured route is rejected rather than silently exposed.
- **`failClosed` only covers check failures, not a missing Redis.** A Redis client that exists but errors mid-check triggers the `failClosed` 503 (`RATE_LIMIT_UNAVAILABLE`); when no Redis is configured at all (`!hasRedis()`), the middleware warns and passes through regardless of `failClosed`.
- **Validator JSON parsing is lenient.** A malformed/missing JSON body silently degrades to query+params; if you require a body, declare a `body` schema so the "Body is required" check fires.
- **`validate()` throws `ValidationError`; the validator middleware returns a 400 directly.** Two different paths — pick based on whether you're inside a handler (use `validate`) or wiring per-route validation (use the middleware via `validators`).
- **Error detail leakage is env-gated.** Generic `Error` messages/stacks are only included when `NODE_ENV === "development"`.
