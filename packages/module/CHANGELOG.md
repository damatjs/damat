# @damatjs/module

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
