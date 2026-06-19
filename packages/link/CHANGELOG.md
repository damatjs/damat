# @damatjs/link

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
