# @damatjs/module

## 0.2.0

### Minor Changes

- 21d0baf: Expose the cross-module link authoring surface from `@damatjs/module`. Module
  code can now `import { defineLink, collectLinkModels, defineLinkModule }` (and the
  `LinkService` / `LinkDefinition` / `LinkEndpoint` / `LinkOptions` / `LinkRowRef` /
  `LinkModelRef` types) from the same single authoring import, matching the
  `@damatjs/framework` surface used by app code. Links still live in the app's
  `src/links/`; the runtime service remains `getModule("link")`.

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
  - @damatjs/codegen@0.1.4
  - @damatjs/logger@0.1.4
  - @damatjs/deps@0.1.4
  - @damatjs/framework@0.1.4
  - @damatjs/orm-connector@0.1.4
  - @damatjs/orm-migration@0.1.4
  - @damatjs/orm-model@0.1.4
  - @damatjs/orm-type@0.1.4
  - @damatjs/services@0.1.4
  - @damatjs/workflow-engine@0.1.4

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
  - @damatjs/framework@0.1.3
  - @damatjs/orm-type@0.1.3
  - @damatjs/logger@0.1.3
  - @damatjs/deps@0.1.3
  - @damatjs/orm-codegen@1.0.3
  - @damatjs/orm-connector@0.1.3
  - @damatjs/orm-migration@0.1.3
  - @damatjs/orm-model@0.1.3
  - @damatjs/services@0.1.3
  - @damatjs/workflow-engine@0.1.3

## 0.1.2

### Patch Changes

- Added support for linking hasOne and belongsTo relations by table name, with foreign keys inferred by convention.
- Updated dependencies
  - @damatjs/logger@0.1.2
  - @damatjs/deps@0.1.2
  - @damatjs/framework@0.1.2
  - @damatjs/orm-codegen@1.0.2
  - @damatjs/orm-connector@0.1.2
  - @damatjs/orm-migration@0.1.2
  - @damatjs/orm-model@0.1.2
  - @damatjs/orm-type@0.1.2
  - @damatjs/services@0.1.2
  - @damatjs/workflow-engine@0.1.2

## 0.1.1

### Patch Changes

- minor clean up on ci and test
- Updated dependencies
  - @damatjs/logger@0.1.1
  - @damatjs/deps@0.1.1
  - @damatjs/framework@0.1.1
  - @damatjs/orm-codegen@1.0.1
  - @damatjs/orm-connector@0.1.1
  - @damatjs/orm-migration@0.1.1
  - @damatjs/orm-model@0.1.1
  - @damatjs/orm-type@0.1.1
  - @damatjs/services@0.1.1
  - @damatjs/workflow-engine@0.1.1

## 0.1.0

### Minor Changes

- Stabilized core functionality, expanded testing, and resolved known issues. Ready for minor release.

### Patch Changes

- Updated dependencies
  - @damatjs/workflow-engine@0.1.0
  - @damatjs/orm-connector@0.1.0
  - @damatjs/orm-migration@0.1.0
  - @damatjs/logger@0.1.0
  - @damatjs/orm-codegen@1.0.0
  - @damatjs/framework@0.1.0
  - @damatjs/orm-model@0.1.0
  - @damatjs/orm-type@0.1.0
  - @damatjs/services@0.1.0
  - @damatjs/deps@0.1.0
