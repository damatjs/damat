# @damatjs/orm-codegen — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/orm/codegen/README.md) and its
[docs](../../packages/orm/codegen/docs/).

This package versions on its own track (it reached `1.x` ahead of the rest of the
monorepo). Its runtime source — the type/Zod mappers, the file generators, and the
relation helpers — has been unchanged since the `0.0.2` baseline; every later
release is a dependency bump, build/CI fix, or test-suite/stabilization pass that
does not alter the generated output.

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| 0.1.3 | Dependency bump (`@damatjs/orm-type`, `@damatjs/orm-model`, `@damatjs/logger` → 0.1.3) — picks up cross-module links in `@damatjs/link`; codegen consumes the unchanged `RelationSchema` shape, no change to this package's code | — |
| 0.1.2 | Dependency bump (deps → 0.1.2) — enables table-name relation targets in `@damatjs/orm-model`; codegen's relation rendering already handles them, no change to this package's code | — |
| 0.1.1 | Maintenance — CI/test cleanup, dependency bumps | — |
| 0.1.0 | Stabilization milestone — declared core functionality stable and expanded the test suite; no API or generated-output change | — |
| 0.0.10 | Pre-release — build fix (`tsc-alias` for `@/` path aliases), dependency bumps | — |
| 0.0.9 | Pre-release — build fix (`tsc-alias` module resolution), dependency bumps | — |
| 0.0.8 | Pre-release — CI build fix for nested packages, dependency bumps | — |
| 0.0.7 | Pre-release — build error fix, version sync, dependency bumps | — |
| 0.0.6 | Pre-release — include `dist` in published package, dependency bumps | — |
| 0.0.5 | Pre-release — build fixes, dependency bumps | — |
| 0.0.4 | Pre-release — build fixes, dependency bumps | — |
| 0.0.3 | Pre-release — build fixes, dependency bumps | — |
| 0.0.2 | First pre-alpha release — the string-generation core: type/Zod mappers, file generators, relations | [0.0.2 →](./0.0.2.md) |
