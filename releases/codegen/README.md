# @damatjs/codegen — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/core/codegen/README.md) and its
[docs](../../packages/core/codegen/docs/).

> Published earlier as `@damatjs/orm-codegen`, then renamed to `@damatjs/codegen`
> and realigned onto the shared `0.1.x` line. Older `<version>.md` files keep the
> historical name.

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| Unreleased | Generates a per-table `<Pascal>ParamsSchema` and scaffolds routes that validate `params`/`query`/`body` through the framework's validation middleware (read via `getValidated`) instead of hand-checking `:id` in the handler. | [Unreleased →](./next.md) |
| 0.1.4 | Codegen graduates from types-only to the engine behind the codegen-first module workflow: alongside row types + zod it now writes the typed `registry.ts` and **scaffolds-once** a per-table CRUD slice (steps, workflows, and split `api/routes`). Existing files are never overwritten (`writeOnce`). | [0.1.4 →](./0.1.4.md) |
| 0.1.3 | Dependency bump (`@damatjs/orm-type`, `@damatjs/orm-model`, `@damatjs/logger` → 0.1.3) — picks up cross-module links in `@damatjs/link`; the type/Zod core consumes the unchanged `RelationSchema` shape, no change to this package's generated output | — |
| 0.1.2 | Dependency bump (deps → 0.1.2) — enables table-name relation targets in `@damatjs/orm-model`; relation rendering already handles them, no change to this package's code | — |
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
