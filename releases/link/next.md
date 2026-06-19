# @damatjs/link Unreleased

> Documentation clarified: links are an app-only concern. No behavior change.

## What changed

Reinforced that cross-module links are authored only in the app, never in a module
package:
- The README import-surface note no longer says a standalone module package can
  import link helpers from `@damatjs/module` — those re-exports were removed (see
  `@damatjs/module` Unreleased). Links come from `@damatjs/framework` and live in
  the app's `src/links/`.
- Fixed the `defineLink` docstring example path to the current owner-foldered
  layout (`src/links/<owner>/models/...`).

## Breaking
- None (docs + a source comment; the runtime/API is unchanged).

## Action required
- None.

## References
- Current behavior: [package README](../../packages/link/README.md).
- Source: `packages/link/src/defineLink.ts` (docstring).
