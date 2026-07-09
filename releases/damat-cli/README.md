# @damatjs/damat-cli — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/cli/damat/README.md) and its
[docs](../../packages/cli/damat/docs/).

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| 0.6.0 | `damat module add` gains security gates: `--allow-unverified` for git/path sources, `--allow-scripts` for lifecycle scripts, pre-write id/path validation, dependency-spec checks; build-time version embedding | [0.6.0 →](./0.6.0.md) |
| 0.4.1 – 0.5.0 | Lockstep bumps — no change to this package's own commands | — |
| 0.4.0 | New `damat module migration:run` (apply this module's migrations to `DATABASE_URL`, idempotent) and `damat module migration:status` (applied vs pending), plus matching scaffold scripts — completing the per-module migrate loop. | [0.4.0 →](./0.4.0.md) |
| 0.3.7 | `damat module add` splits a module's shipped link files (`defineLink`s) into `src/links/<moduleId>/`, regenerates the aggregator, and ensures `links:` in config; the junction migration runs on the backend (dormant until activated). Removes the draft flow + `damat module link-setup`. | [0.3.7 →](./0.3.7.md) |
| 0.3.6 | `damat build` type-checks the whole app before bundling (fails on any error; `--no-typecheck` opts out) and fails on a broken config bundle; new `damat module build` gate (type-check + contract validate). | [0.3.6 →](./0.3.6.md) |
| 0.1.4 | `damat module init` emits a root `README.md` + full `AGENTS.md` guide; `damat codegen` / `damat module codegen` scaffold a per-table CRUD slice (steps, workflows, routes). | [0.1.4 →](./0.1.4.md) |
| 0.1.3 | Dependency/version bump only — no change to the `damat` CLI (monorepo-wide bump alongside `@damatjs/link`; cross-module links are handled by the framework/orm, and `damat build` already copies all of `src/` including `src/links` generically). | — |
| 0.1.2 | Dependency/version bump only — no change to the `damat` CLI (table-name `hasOne`/`belongsTo` relations land via the ORM/module deps). | — |
| 0.1.1 | Maintenance — CI/test workflow cleanup; no change to the `damat` CLI. | — |
| 0.1.0 | First minor release of the `damat` CLI: `dev`/`build`/`start` plus the `module` group (`add`, `list`, `init`, `dev`, `migration:create`, `codegen`, `validate`). | [0.1.0 →](./0.1.0.md) |
| 0.0.10 | Pre-release maintenance (tsc-alias path resolution, optional inherited config). | — |
| 0.0.9 | Pre-release maintenance (tsc-alias for `@/` aliases). | — |
| 0.0.8 | Pre-release maintenance (CI builds nested packages, prepublishOnly guard kept). | — |
| 0.0.7 | Pre-release maintenance (build fix, version sync). | — |
| 0.0.6 | Pre-release maintenance (ship `dist`, prepublishOnly guard). | — |
| 0.0.5 | Pre-release maintenance (build fixes). | — |
| 0.0.4 | Pre-release maintenance (build fixes). | — |
| 0.0.3 | Pre-release maintenance (build fixes). | — |
| 0.0.2 | First pre-alpha release. | — |
