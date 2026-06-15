# @damatjs/types — Internals

Maintainer-facing documentation for `@damatjs/types`. For the user-facing overview see
the [package README](../README.md).

The package is intentionally tiny: a single source file declaring an error hierarchy
plus one legacy helper. There is no build step beyond `tsc`, no runtime dependencies,
and no subpath exports.

## Module map

| File                       | Responsibility                                                                 |
| -------------------------- | ------------------------------------------------------------------------------ |
| `src/index.ts`             | The entire public API: all error classes + `initFramework`. Single entry point.|
| `package.json`             | Name `@damatjs/types`, version, `exports` map (`.` → `dist/index.js`).          |
| `tsconfig.json`            | Extends `@damatjs/typescript-config/base.json`; `rootDir: src`, `outDir: dist`. |

There is exactly one module of substance. Everything documented here lives in
[`src/index.ts`](../src/index.ts).

## Architecture overview

The design is a classic single-root error hierarchy:

```
Error (built-in)
  └── AppError                 statusCode, code, details
        ├── ValidationError    400  VALIDATION_ERROR
        ├── AuthenticationError 401 UNAUTHORIZED
        ├── AuthorizationError 403 FORBIDDEN
        ├── NotFoundError      404  NOT_FOUND
        └── RateLimitError     429  RATE_LIMITED
```

Every subclass forwards to `AppError`'s constructor with a fixed `statusCode` and
`code`, then overrides `this.name` so stack traces and serialized output read naturally.

See [error-classes.md](./error-classes.md) for the per-class breakdown, status-code
table, serialization notes, and safe-extension guidance.

## Control / data flow

These are plain value objects — there is no runtime machinery, no registry, no global
state. The flow is entirely at the call sites of consuming packages:

1. A lower layer (ORM, service) detects a failure and `throw`s the most specific
   subclass, optionally with `details`.
2. The error propagates up the call stack unchanged.
3. An HTTP boundary (framework middleware / error handler) does a single
   `instanceof AppError` check and reads `statusCode`, `code`, `message`, `details`
   to build the response body.

Because all subclasses inherit from `AppError`, the boundary never needs to know about
the specific subclasses.

## Invariants & design decisions

- **Zero dependencies.** Nothing is imported except the built-in `Error`. This keeps
  the package at the bottom of the dependency graph so any other package can use it.
- **`statusCode` and `code` are `readonly`.** They are assigned once in the constructor
  and never mutated. Treat instances as immutable.
- **`AppError` defaults to 500 / `INTERNAL_ERROR`.** An `AppError` constructed with no
  status/code represents an unexpected server error.
- **`this.name` is set after `super()`.** Each subclass overrides `name` so the value
  matches the class, not the inherited `"AppError"`/`"Error"`.
- **`details` is `unknown`.** It is deliberately untyped on the base class so callers
  can attach anything; only `RateLimitError` narrows it (`{ retryAfter?: number }`).
- **No custom serializer.** There is no `toJSON()`. Consumers read fields directly. See
  the serialization caveat in [error-classes.md](./error-classes.md).

## Gotchas

- `details` is **not** included by `JSON.stringify(error)` automatically in a useful
  way — `Error` enumerability rules mean `message`/`stack` are non-enumerable. Build the
  response object explicitly from `statusCode`/`code`/`message`/`details`.
- `instanceof` is the intended discriminator. If errors cross a serialization boundary
  (e.g. worker threads, JSON over the wire) the prototype is lost; re-hydrate or switch
  on `code` in that case.
- `initFramework` is a legacy no-op kept for backwards compatibility. It logs to the
  console and returns `true`; it is not part of the error system. Do not build on it.

## Related docs

- [error-classes.md](./error-classes.md) — the `AppError` hierarchy in detail.
- [Package README](../README.md)
- [Damat guide](../../../../docs/GUIDE.md)
