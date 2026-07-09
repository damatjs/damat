# @damatjs/orm-pg — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/orm/pg/README.md) and its
[docs](../../packages/orm/pg/docs/).

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| 0.6.0 | `ORDER BY` direction and nulls placement validated against whitelists before SQL interpolation | [0.6.0 →](./0.6.0.md) |
| 0.5.0 | Lockstep bump with the 0.5.0 codebase audit — no change to this package's own API | — |
| 0.4.1 | `getRepository` falls back to table-name lookup — cascade deletes work on snake_case tables | [0.4.1 →](./0.4.1.md) |
| 0.3.6 – 0.4.0 | Lockstep bumps — no change to this package's own code | — |
| 0.3.0 | Bulk upsert execution — adds `PgRepository.upsertMany` / `PgModelClient.upsertMany` over the existing accessor SQL | [0.3.0 →](./0.3.0.md) |
| 0.1.3 | Dependency bump — picks up the cross-module links work in `@damatjs/link`; no change to this package's own code | — |
| 0.1.2 | Dependency bump — picks up string table-name relations in `@damatjs/orm-model`; no change to this package's own code | — |
| 0.1.1 | Maintenance — CI and test cleanup, dependency bumps | — |
| 0.1.0 | First published minor release — entity-manager hardening: optional `models` config, registry-derived `tx.<model>` accessors, isolation-level allow-list, rollback-error guard, typed repo reads | [0.1.0 →](./0.1.0.md) |
| 0.0.10 | Pre-release — build fix (`tsc-alias` for `@/` path aliases), dependency bumps | — |
| 0.0.9 | Pre-release — build fix (`tsc-alias` module resolution), dependency bumps | — |
| 0.0.8 | Pre-release — CI build fix for nested packages, dependency bumps | — |
| 0.0.7 | Pre-release — build error fix, version sync, dependency bumps | — |
| 0.0.6 | Pre-release — include `dist` in published package, dependency bumps | — |
| 0.0.5 | Pre-release — build fixes, dependency bumps | — |
| 0.0.4 | Pre-release — build fixes, dependency bumps | — |
| 0.0.3 | Pre-release — build fixes, dependency bumps | — |
| 0.0.2 | First pre-alpha release — the PostgreSQL execution layer (manager / repository / client / query builder / executor / transactions) | [0.0.2 →](./0.0.2.md) |
</content>
</invoke>
