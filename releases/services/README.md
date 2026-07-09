# @damatjs/services — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/service/README.md) and its
[docs](../../packages/service/docs/).

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| 0.6.0 | Request-derived options sanitized (`buildFindOptions`), whitelist-validated `orderBy`, bounded pagination (`take` ≤ 1000), soft-delete-aware reads (`withDeleted`), auto `updated_at` stamping, narrowed delete contract | [0.6.0 →](./0.6.0.md) |
| 0.5.0 | Lockstep bump with the 0.5.0 codebase audit — no change to this package's own API | — |
| 0.4.1 | `resolveModel` falls back to table-name lookup — cross-module cascade deletes resolve snake_case child tables | [0.4.1 →](./0.4.1.md) |
| 0.3.6 – 0.4.0 | Lockstep bumps — no change to this package's own API | — |
| 0.3.0 | `ModelMethods` gains `upsert`/`upsertMany`, cascade delete (`delete`/`softDelete` with `cascade: true`), and row-returning `updateOne` / `findById` / `findOne` | [0.3.0 →](./0.3.0.md) |
| 0.1.3 | Maintenance / dependency bumps — picks up cross-module links via `@damatjs/link`/`@damatjs/framework`; no change to this package's own API | — |
| 0.1.2 | Maintenance / dependency bumps — relation-by-table-name lands in the ORM packages; no change to this package's own API | — |
| 0.1.1 | Maintenance / dependency bumps — CI and test cleanup | — |
| 0.1.0 | First published minor release — the service layer: `ModuleService` CRUD factory, `PoolManager`, and `defineModule` | [0.1.0 →](./0.1.0.md) |
| 0.0.10 | Maintenance / dependency bumps — `tsc-alias` for `@/` path resolution in published builds; optional inherited package config | — |
| 0.0.9 | Maintenance / dependency bumps — `tsc-alias` for `@/` module resolution in published packages | — |
| 0.0.8 | Maintenance / dependency bumps — CI builds nested packages; `prepublishOnly` check kept | — |
| 0.0.7 | Maintenance / dependency bumps — build-error fix; version sync | — |
| 0.0.6 | Maintenance / dependency bumps — include `dist` in published package; add `prepublishOnly` guard | — |
| 0.0.5 | Maintenance / dependency bumps — build fixes | — |
| 0.0.4 | Maintenance / dependency bumps — build fixes | — |
| 0.0.3 | Maintenance / dependency bumps — build fixes | — |
| 0.0.2 | First published pre-alpha — core features functional end-to-end (not production-ready) | — |
