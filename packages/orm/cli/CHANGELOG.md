# @damatjs/orm-cli

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
  - @damatjs/cli@0.1.4
  - @damatjs/logger@0.1.4
  - @damatjs/deps@0.1.4
  - @damatjs/link@0.1.4
  - @damatjs/orm-migration@0.1.4
  - @damatjs/orm-model@0.1.4
  - @damatjs/orm-processor@0.1.4
  - @damatjs/orm-type@0.1.4

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
  - @damatjs/link@0.1.3
  - @damatjs/cli@0.1.3
  - @damatjs/logger@0.1.3
  - @damatjs/deps@0.1.3
  - @damatjs/orm-codegen@1.0.3
  - @damatjs/orm-migration@0.1.3
  - @damatjs/orm-model@0.1.3
  - @damatjs/orm-processor@0.1.3

## 0.1.2

### Patch Changes

- Added support for linking hasOne and belongsTo relations by table name, with foreign keys inferred by convention.
- Updated dependencies
  - @damatjs/cli@0.1.2
  - @damatjs/logger@0.1.2
  - @damatjs/deps@0.1.2
  - @damatjs/orm-codegen@1.0.2
  - @damatjs/orm-migration@0.1.2
  - @damatjs/orm-model@0.1.2
  - @damatjs/orm-processor@0.1.2
  - @damatjs/orm-type@0.1.2

## 0.1.1

### Patch Changes

- minor clean up on ci and test
- Updated dependencies
  - @damatjs/cli@0.1.1
  - @damatjs/logger@0.1.1
  - @damatjs/deps@0.1.1
  - @damatjs/orm-codegen@1.0.1
  - @damatjs/orm-migration@0.1.1
  - @damatjs/orm-model@0.1.1
  - @damatjs/orm-processor@0.1.1
  - @damatjs/orm-type@0.1.1

## 0.1.0

### Minor Changes

- Stabilized core functionality, expanded testing, and resolved known issues. Ready for minor release.

### Patch Changes

- Updated dependencies
  - @damatjs/orm-migration@0.1.0
  - @damatjs/orm-processor@0.1.0
  - @damatjs/logger@0.1.0
  - @damatjs/orm-codegen@1.0.0
  - @damatjs/orm-model@0.1.0
  - @damatjs/cli@0.1.0
  - @damatjs/orm-type@0.1.0
  - @damatjs/deps@0.1.0

## 0.0.10

### Patch Changes

- fix: add tsc-alias to packages using @/ path aliases to ensure correct module resolution in published builds, and make inherited package configuration optional
- Updated dependencies
  - @damatjs/deps@0.0.10
  - @damatjs/cli@0.0.10
  - @damatjs/logger@0.0.10
  - @damatjs/orm-codegen@0.0.10
  - @damatjs/orm-migration@0.0.10
  - @damatjs/orm-model@0.0.10
  - @damatjs/orm-processor@0.0.10
  - @damatjs/orm-type@0.0.10

## 0.0.9

### Patch Changes

- Fix: Add tsc-alias to all packages using @/ path aliases to ensure proper module resolution in published packages
- Updated dependencies
  - @damatjs/orm-migration@0.0.9
  - @damatjs/orm-processor@0.0.9
  - @damatjs/cli@0.0.9
  - @damatjs/logger@0.0.9
  - @damatjs/deps@0.0.9
  - @damatjs/orm-codegen@0.0.9
  - @damatjs/orm-model@0.0.9
  - @damatjs/orm-type@0.0.9

## 0.0.8

### Patch Changes

- Fix: Update CI workflow to build nested packages and keep prepublishOnly check
- Updated dependencies
  - @damatjs/cli@0.0.8
  - @damatjs/logger@0.0.8
  - @damatjs/deps@0.0.8
  - @damatjs/orm-codegen@0.0.8
  - @damatjs/orm-migration@0.0.8
  - @damatjs/orm-model@0.0.8
  - @damatjs/orm-processor@0.0.8
  - @damatjs/orm-type@0.0.8

## 0.0.7

### Patch Changes

- Build error fix ad syncing all to 0.0.7
- Updated dependencies
  - @damatjs/cli@0.0.7
  - @damatjs/logger@0.0.7
  - @damatjs/deps@0.0.7
  - @damatjs/orm-codegen@0.0.7
  - @damatjs/orm-migration@0.0.7
  - @damatjs/orm-model@0.0.7
  - @damatjs/orm-processor@0.0.7
  - @damatjs/orm-type@0.0.7

## 0.0.6

### Patch Changes

- Fix: Include dist folder in published package - add prepublishOnly check to prevent publishing without built files

## 0.0.5

### Patch Changes

- no major change, fixed some of the build issue
- Updated dependencies
  - @damatjs/cli@0.0.5
  - @damatjs/logger@0.0.5
  - @damatjs/deps@0.0.5
  - @damatjs/orm-codegen@0.0.5
  - @damatjs/orm-migration@0.0.5
  - @damatjs/orm-model@0.0.5
  - @damatjs/orm-processor@0.0.5
  - @damatjs/orm-type@0.0.5

## 0.0.4

### Patch Changes

- no major change, fixed some of the build issue
- Updated dependencies
  - @damatjs/cli@0.0.4
  - @damatjs/logger@0.0.4
  - @damatjs/deps@0.0.4
  - @damatjs/orm-codegen@0.0.4
  - @damatjs/orm-migration@0.0.4
  - @damatjs/orm-model@0.0.4
  - @damatjs/orm-processor@0.0.4
  - @damatjs/orm-type@0.0.4

## 0.0.3

### Patch Changes

- no major change, fixed some of the build issue
- Updated dependencies
  - @damatjs/cli@0.0.3
  - @damatjs/logger@0.0.3
  - @damatjs/deps@0.0.3
  - @damatjs/orm-codegen@0.0.3
  - @damatjs/orm-migration@0.0.3
  - @damatjs/orm-model@0.0.3
  - @damatjs/orm-processor@0.0.3
  - @damatjs/orm-type@0.0.3

## 0.0.2

### Patch Changes

- This is the first stable pre-alpha release of the project. All core features are implemented and working as expected, and the package is now functional end-to-end. However, it is not intended for production use at this stage. As a pre-alpha release, stability is not guaranteed, and users may encounter bugs, breaking changes, or unexpected behavior as the project continues to evolve. This version is primarily meant for early testing, feedback, and iterative improvement as the foundation for future stable releases.
- Updated dependencies
  - @damatjs/orm-migration@0.0.2
  - @damatjs/orm-processor@0.0.2
  - @damatjs/orm-codegen@0.0.2
  - @damatjs/orm-model@0.0.2
  - @damatjs/cli@0.0.2
  - @damatjs/deps@0.0.2
  - @damatjs/logger@0.0.2
  - @damatjs/orm-type@0.0.2
