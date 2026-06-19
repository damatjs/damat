# @damatjs/module Unreleased

> Cross-module link helpers are no longer part of the module authoring surface,
> and a non-binding `pairsWith` manifest hint is added.

## What changed

**Links removed from the authoring surface.** `@damatjs/module` previously
re-exported `defineLink` / `collectLinkModels` / `defineLinkModule` (and the
`Link*` types) from `@damatjs/framework`, so module code *could* define links.
That contradicts the model: a module is a single-purpose unit and must not decide
cross-module composition. Those re-exports are gone — links are authored only in
the **app** via `@damatjs/framework`.

```ts
// Before (in a module package):
import { defineLink } from "@damatjs/module"; // ← no longer exported
// After: links live in the app's src/links/, imported from @damatjs/framework.
//        A module package no longer references links at all.
```

## Added

- `module.json` `pairsWith?: string[]` — a **non-binding** hint listing modules
  this one pairs well with. Never enforced or installed; a comment for the backend
  owner, who decides composition. Prefer it over `modules`.

## Changed / improved

- `modules` (hard dependency) is now documented as a rare escape hatch; authors
  are steered to `pairsWith`.

## Breaking

- A module package that imported `defineLink` / `collectLinkModels` /
  `defineLinkModule` from `@damatjs/module` no longer can. (No in-repo module did.)

## Action required

- If module code imported link helpers from `@damatjs/module`, remove them and
  define links in the app instead (`@damatjs/framework`, `src/links/`).
- Optional: replace a `modules: [...]` hard dependency with `pairsWith: [...]`
  unless the dependency is genuinely required.

## References
- Current behavior: [authoring surface](../../packages/module/docs/authoring.md),
  [MODULES.md](../../MODULES.md).
- Source: `packages/module/src/authoring.ts`, `packages/module/src/manifest/`.
