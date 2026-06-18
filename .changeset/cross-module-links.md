---
"@damatjs/link": minor
"@damatjs/framework": minor
"@damatjs/orm-cli": minor
---

Add cross-module links (`@damatjs/link`). Declare a relationship between two
models that live in different modules with `defineLink`, which generates a
junction table that migrates and type-generates through the existing pipelines.
At runtime, `getModule("link")` exposes `create`/`dismiss`/`fetch` and a nested
`graph` query to traverse linked records across modules. Links live in
`src/links/` and are wired in via a new `links` field in `damat.config.ts`; the
framework boot and the `damat-orm` CLI both pick them up automatically.
