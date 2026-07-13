---
"@damatjs/redis": patch
"@damatjs/framework": minor
"@damatjs/workflow-engine": minor
"@damatjs/types": patch
"@damatjs/damat-cli": patch
"@damatjs/orm-model": minor
---

Robustness fixes across the core packages:

- **@damatjs/redis**: `RedisClient` now falls back to a real console-backed `ILogger` adapter instead of casting `console` to `ILogger` (calling `success`/`child`/`withPrefix` on the fallback no longer crashes).
- **@damatjs/framework**: `BootstrapResult.app` is typed as `Hono` (was `any`); health-check `data` is `unknown` (was `any`). Shutdown handler failures are now logged with the handler name instead of being silently swallowed (`runShutdownHandlers` is exported for testing). New opt-in `failClosed` flag on rate-limit config: when the rate-limit backend is unreachable the middleware responds 503 `RATE_LIMIT_UNAVAILABLE` instead of failing open.
- **@damatjs/workflow-engine**: failed compensations are surfaced on the workflow failure result via a new `compensationErrors: CompensationError[]` field (alongside `compensationsFailed`); throw behavior is unchanged.
- **@damatjs/types**: `initFramework()` is deprecated (no-op retained; removal planned for 0.7).
- **@damatjs/damat-cli**: temp-entry-file cleanup failures in `dev`/`build`/`module dev` are logged at debug level via a shared `cleanupTempFile` helper instead of being silently ignored.
- **@damatjs/orm-model**: removed empty leftover files (`properties/foreignKeys/`, `properties/relation/validate.ts`); the relation validation API (`validateRelations`, `formatViolations`, `ValidationResult`, `RelationViolation`, `ViolationKind`) is now correctly re-exported from the package barrel as originally intended (the empty file had been shadowing it).
