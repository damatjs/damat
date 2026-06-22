# @damatjs/link

## 0.2.0

### Minor Changes

- - Strengthen module-authoring docs and fix the scaffolding CLIs end-to-end.

    **Docs & conventions** — drilled the core rules into `module`/`module-sample`, the scaffold `AGENTS.md`, the `damat-modules` skill, and the per-folder READMEs:
    - Codegen-first flow
    - One-way layering: route → workflow → step → service
    - No big files: `lib/` for integrations, `utils/` for helpers
    - Clear service/route boundaries

    **Scaffolding CLIs**
    - `damat module init` now emits a root `README.md` plus the full `AGENTS.md` guide. The guide is embedded as compiled code via `scripts/embedAgents.ts` (guarded by `prepublishOnly`) so it reliably ships in the published package.
    - Added a `defaultCommand` to the `@damatjs/cli` framework, so `create-damat-app <name>` works without typing `create`.
    - `create-damat-app --module` now scaffolds locally through `@damatjs/damat-cli module init` instead of cloning a missing remote starter repo. `--repo-url` still clones a custom one.
    - Corrected the `create-damat-app` README/docs and skill guidance to match.

### Patch Changes

- Updated dependencies
  - @damatjs/logger@0.2.0
  - @damatjs/deps@0.2.0
  - @damatjs/orm-model@0.2.0
  - @damatjs/orm-pg@0.2.0
  - @damatjs/orm-type@0.2.0
  - @damatjs/services@0.2.0

## 0.1.4

### Patch Changes

- Strengthen module-authoring docs and fix the scaffolding CLIs end-to-end.

  **Docs & conventions** — drilled the core rules into `module`/`module-sample`, the scaffold `AGENTS.md`, the `damat-modules` skill, and the per-folder READMEs:
  - Codegen-first flow
  - One-way layering: route → workflow → step → service
  - No big files: `lib/` for integrations, `utils/` for helpers
  - Clear service/route boundaries

  **Scaffolding CLIs**
  - `damat module init` now emits a root `README.md` plus the full `AGENTS.md` guide. The guide is embedded as compiled code via `scripts/embedAgents.ts` (guarded by `prepublishOnly`) so it reliably ships in the published package.
  - Added a `defaultCommand` to the `@damatjs/cli` framework, so `create-damat-app <name>` works without typing `create`.
  - `create-damat-app --module` now scaffolds locally through `@damatjs/damat-cli module init` instead of cloning a missing remote starter repo. `--repo-url` still clones a custom one.
  - Corrected the `create-damat-app` README/docs and skill guidance to match.

- Updated dependencies
  - @damatjs/logger@0.1.4
  - @damatjs/deps@0.1.4
  - @damatjs/orm-model@0.1.4
  - @damatjs/orm-pg@0.1.4
  - @damatjs/orm-type@0.1.4
  - @damatjs/services@0.1.4

## 0.1.3

### Patch Changes

- Add cross-module links (`@damatjs/link`). Declare a relationship between two
  models that live in different modules with `defineLink`, which generates a
  junction table that migrates and type-generates through the existing pipelines.
  At runtime, `getModule("link")` exposes `create`/`dismiss`/`fetch` and a nested
  `graph` query to traverse linked records across modules. Links live in
  `src/links/` and are wired in via a new `links` field in `damat.config.ts`; the
  framework boot and the `damat-orm` CLI both pick them up automatically.
- Updated dependencies
  - @damatjs/orm-type@0.1.3
  - @damatjs/logger@0.1.3
  - @damatjs/deps@0.1.3
  - @damatjs/orm-model@0.1.3
  - @damatjs/orm-pg@0.1.3
  - @damatjs/services@0.1.3
