# Error classes — the `AppError` hierarchy

All error types live in [`src/index.ts`](../src/index.ts). This document covers the base
class, each subclass, status-code mapping, serialization, and how to extend the set
safely.

## Responsibility

Provide a single, HTTP-aware error base (`AppError`) and a set of ready-made subclasses
for the most common failure categories. Throwing these instead of bare `Error`s lets a
single HTTP boundary translate any failure into a consistent response with a numeric
`statusCode`, a stable string `code`, a human `message`, and optional structured
`details`.

## `AppError` — the base class

[`src/index.ts:3`](../src/index.ts)

```ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
```

Behavior, step by step:

1. `super(message)` sets the standard `Error.message` and captures a stack.
2. `this.name = "AppError"` overrides the default so `error.name` and the stack header
   read `AppError`.
3. `statusCode`, `code`, `details` are assigned as `readonly` public fields.

Defaults (`500` / `"INTERNAL_ERROR"`) mean a bare `new AppError("boom")` represents an
unexpected internal error. Pass explicit arguments to express anything else:

```ts
throw new AppError("Teapot", 418, "IM_A_TEAPOT", { rfc: 2324 });
```

## Subclasses

Each subclass hard-codes its `statusCode` and `code`, then resets `this.name`.

### `ValidationError` — 400 `VALIDATION_ERROR`

[`src/index.ts:22`](../src/index.ts)

```ts
new ValidationError(message: string, details?: unknown)
// → super(message, 400, "VALIDATION_ERROR", details)
```

Use for malformed input. Put field-level problems in `details`, e.g.
`{ fields: { email: "required" } }`.

### `AuthenticationError` — 401 `UNAUTHORIZED`

[`src/index.ts:43`](../src/index.ts)

```ts
new AuthenticationError(message: string = "Authentication required")
// → super(message, 401, "UNAUTHORIZED")
```

"Who are you?" — missing or invalid credentials. No `details` parameter.

### `AuthorizationError` — 403 `FORBIDDEN`

[`src/index.ts:50`](../src/index.ts)

```ts
new AuthorizationError(message: string = "Access denied")
// → super(message, 403, "FORBIDDEN")
```

"You may not do this" — authenticated but not permitted. No `details` parameter.

### `NotFoundError` — 404 `NOT_FOUND`

[`src/index.ts:36`](../src/index.ts)

```ts
new NotFoundError(message: string = "Not found")
// → super(message, 404, "NOT_FOUND")
```

Missing resource. No `details` parameter.

### `RateLimitError` — 429 `RATE_LIMITED`

[`src/index.ts:29`](../src/index.ts)

```ts
new RateLimitError(message: string, details?: { retryAfter?: number })
// → super(message, 429, "RATE_LIMITED", details)
```

The only subclass with a **typed** `details` shape. `retryAfter` is intended as a
seconds hint a caller can surface via a `Retry-After` header.

## Status-code & code matrix

| Class                 | `statusCode` | `code`             | `name`                | `details` parameter        |
| --------------------- | ------------ | ------------------ | --------------------- | -------------------------- |
| `AppError`            | 500 (default) | `INTERNAL_ERROR` (default) | `"AppError"`   | `unknown` (4th arg)        |
| `ValidationError`     | 400          | `VALIDATION_ERROR` | `"ValidationError"`   | `unknown` (2nd arg)        |
| `AuthenticationError` | 401          | `UNAUTHORIZED`     | `"AuthenticationError"` | —                        |
| `AuthorizationError`  | 403          | `FORBIDDEN`        | `"AuthorizationError"`  | —                        |
| `NotFoundError`       | 404          | `NOT_FOUND`        | `"NotFoundError"`     | —                          |
| `RateLimitError`      | 429          | `RATE_LIMITED`     | `"RateLimitError"`    | `{ retryAfter?: number }`  |

## Serialization

There is **no** `toJSON()` on these classes. `Error.message` and `Error.stack` are
non-enumerable, so `JSON.stringify(new NotFoundError())` yields `{}` for the inherited
fields. The custom fields (`statusCode`, `code`, `details`) *are* enumerable own
properties and will serialize, but relying on `JSON.stringify(error)` directly is
fragile.

Build the response body explicitly at the boundary:

```ts
function toResponseBody(err: AppError) {
  return {
    code: err.code,
    message: err.message,
    ...(err.details !== undefined ? { details: err.details } : {}),
  };
}
```

When errors cross a process/serialization boundary (worker threads, network), the class
prototype is lost. Switch on `code` rather than `instanceof` in those cases, or
re-hydrate into the right class.

## Safe extension

To add a new error category:

1. Add a subclass in `src/index.ts` that `extends AppError`, calls `super(message, <status>, "<CODE>", details?)`, and sets `this.name`:

   ```ts
   export class ConflictError extends AppError {
     constructor(message: string = "Conflict", details?: unknown) {
       super(message, 409, "CONFLICT", details);
       this.name = "ConflictError";
     }
   }
   ```

2. Keep `code` values `SCREAMING_SNAKE_CASE` and unique — downstream consumers may
   switch on them.
3. Keep fields `readonly`; do not mutate after construction.
4. If you give the subclass a typed `details`, narrow it in the constructor signature
   (as `RateLimitError` does) rather than widening the base.
5. Because the package has no internal index/registry, exporting the class from
   `src/index.ts` is all that's required — there is nothing else to register.

Avoid:

- Changing an existing class's `statusCode` or `code` — that is a breaking change for
  every consumer's response mapping.
- Adding runtime dependencies; this package must stay at the bottom of the graph.
