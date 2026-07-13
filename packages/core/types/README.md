# @damatjs/types

> Shared error classes and utility types for the Damat framework.

`@damatjs/types` is the lowest-level package in the Damat stack: a zero-dependency
collection of HTTP-aware error classes (`AppError` and its subclasses) plus one
deprecated legacy helper. Almost every other Damat package depends on it so that errors thrown
deep in the ORM, services, or workflow layers carry a consistent `statusCode` and
machine-readable `code` all the way up to the HTTP boundary. If you are building on
Damat, throw these errors instead of bare `Error`s and your HTTP handlers can map them
to responses uniformly.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/types
```

Inside the monorepo it is consumed as a workspace package — depend on it with `"*"`:

```json
{
  "dependencies": {
    "@damatjs/types": "*"
  }
}
```

## When to use

Use it when you want to:

- Throw domain errors that already know their HTTP status and a stable error `code`
  (`VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, …).
- Catch `AppError` in a single place (middleware, an error boundary) and translate it
  into an HTTP response without `instanceof` checks against many ad-hoc classes.
- Attach structured `details` (e.g. field validation issues, `retryAfter` seconds) to
  an error for clients or logs.

Skip it when:

- You need rich validation schemas — use Zod (`@damatjs/deps/zod`) and wrap the result
  in a `ValidationError` if you want a thrown error.
- You want a generic, non-HTTP error type. `AppError` is intentionally HTTP-shaped.

## Quick start

```ts
import {
  AppError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from "@damatjs/types";

function getUser(id: string) {
  const user = db.find(id);
  if (!user) throw new NotFoundError(`User ${id} not found`);
  return user;
}

// Throwing with structured details
throw new ValidationError("Invalid signup payload", {
  fields: { email: "must be a valid email" },
});

// 429 with a hint for the client
throw new RateLimitError("Too many requests", { retryAfter: 30 });

// A single catch site can map every error to a response
try {
  getUser("usr_404");
} catch (err) {
  if (err instanceof AppError) {
    // err.statusCode -> 404, err.code -> "NOT_FOUND", err.details -> undefined
    sendResponse(err.statusCode, { code: err.code, message: err.message, details: err.details });
  } else {
    throw err;
  }
}
```

## API

All exports come from the single entry point `@damatjs/types`.

| Export                | Kind  | Summary                                                                    |
| --------------------- | ----- | -------------------------------------------------------------------------- |
| `AppError`            | class | Base error. `statusCode`, `code`, optional `details`. Defaults to 500.     |
| `ValidationError`     | class | `extends AppError` → 400, code `VALIDATION_ERROR`. Takes `details`.        |
| `AuthenticationError` | class | `extends AppError` → 401, code `UNAUTHORIZED`. Default message.             |
| `AuthorizationError`  | class | `extends AppError` → 403, code `FORBIDDEN`. Default message.                |
| `NotFoundError`       | class | `extends AppError` → 404, code `NOT_FOUND`. Default message `"Not found"`.  |
| `RateLimitError`      | class | `extends AppError` → 429, code `RATE_LIMITED`. `details.retryAfter?`.       |
| `initFramework`       | fn    | **`@deprecated`** no-op: logs `"Framework initialized"` and returns `true`. Removal planned for 0.7 — drop the call. |

### Error class reference

| Class                 | HTTP status | `code`             | Constructor signature                                  |
| --------------------- | ----------- | ------------------ | ------------------------------------------------------ |
| `AppError`            | 500\*       | `INTERNAL_ERROR`\* | `(message, statusCode?, code?, details?)`              |
| `ValidationError`     | 400         | `VALIDATION_ERROR` | `(message, details?)`                                  |
| `AuthenticationError` | 401         | `UNAUTHORIZED`     | `(message = "Authentication required")`                |
| `AuthorizationError`  | 403         | `FORBIDDEN`        | `(message = "Access denied")`                          |
| `NotFoundError`       | 404         | `NOT_FOUND`        | `(message = "Not found")`                              |
| `RateLimitError`      | 429         | `RATE_LIMITED`     | `(message, details?: { retryAfter?: number })`         |

\* `AppError` defaults; both are overridable via constructor arguments.

Every instance exposes:

```ts
class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
}
```

No subpath exports — the package ships a single `.` entry.

## How it fits

**Dependencies:** none (zero runtime dependencies).

**In-repo dependents** (depend on `@damatjs/types` via `"*"`):

- `@damatjs/framework`
- `@damatjs/services` (`packages/service`)
- `@damatjs/orm-pg` (`packages/orm/pg`)
- `@damatjs/orm-connector` (`packages/orm/connector`)
- `@damatjs/orm-processor` (`packages/orm/processor`)
- `@damatjs/orm-migration` (`packages/orm/migration`)
- `@damatjs/default` (`backend/default`)

Because it has no dependencies, it sits at the bottom of the build graph and is safe to
import from anywhere.

## Documentation

- [Internals & maintainer docs](./docs/README.md) — error hierarchy, status-code mapping, serialization.
- [Full Damat guide](../../../docs/GUIDE.md)

## License

MIT
