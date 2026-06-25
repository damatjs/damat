# @damatjs/workflow-engine — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/workflow-engine/README.md) and its
[docs](../../packages/workflow-engine/docs/).

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| 0.3.7 | Steps return `StepResponse(output, compensateInput?)`; compensation is `(compensateInput, ctx)` with a type-enforced rollback payload (no output fallback) | [0.3.7 →](./0.3.7.md) |
| 0.1.3 | Dependency bump (`@damatjs/logger`, `@damatjs/redis`) — picks up the cross-module links work in `@damatjs/link`; no change to this package's API | — |
| 0.1.2 | Dependency bump (`@damatjs/logger`, `@damatjs/redis`) — version sync alongside the table-name relations work in `@damatjs/orm-model`; no change to this package's API | — |
| 0.1.1 | Maintenance — CI and test cleanup, dependency bumps | — |
| 0.1.0 | Stabilization minor: workflow-level step-config layering, AbortSignal cancellation, per-attempt timeouts, capped backoff, `compensationsFailed` tracking, and retry-exhaustion surfaced as `MAX_RETRIES_EXCEEDED` at the workflow boundary | [0.1.0 →](./0.1.0.md) |
| 0.0.10 | Pre-release — build fix (`tsc-alias` for `@/` path aliases), dependency bumps | — |
| 0.0.9 | Pre-release — build fix (`tsc-alias` module resolution), dependency bumps | — |
| 0.0.8 | Pre-release — CI build fix for nested packages, dependency bumps | — |
| 0.0.7 | Pre-release — build error fix, version sync, dependency bumps | — |
| 0.0.6 | Pre-release — include `dist` in published package, dependency bumps | — |
| 0.0.5 | Pre-release — build fixes, dependency bumps | — |
| 0.0.4 | Pre-release — build fixes, dependency bumps | — |
| 0.0.3 | Pre-release — build fixes, dependency bumps | — |
| 0.0.2 | First pre-alpha release — the saga-style workflow engine (steps, compensation, retry/timeout, distributed locking) | [0.0.2 →](./0.0.2.md) |
