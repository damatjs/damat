# @damatjs/damat-cli Unreleased

> `damat build` now type-checks the whole app before bundling (and fails on any
> error), and a new `damat module build` does the same as a module's release gate.

## What changed

`damat build` previously bundled a tiny entry (`runEntry()`), copied `src/`
verbatim, and bundled `damat.config.ts` — none of which type-checked the app, and
the config bundle's exit code was ignored. A type error in a workflow/route/service
passed the build and only surfaced at runtime.

Now `damat build` runs `tsc --noEmit` over the whole app **first** and aborts on
any type or compile error, then bundles; a failing `damat.config.ts` bundle also
fails the build:

```bash
damat build                 # type-check, then bundle (fails on any type error)
damat build --no-typecheck  # skip the check — bundle only (fast)
```

A new **`damat module build`** is the analogous gate for a standalone module.
A module ships as source, so its "build" is verification, not a bundle: it
type-checks (`tsc --noEmit`) and runs the contract + registry-readiness check
(the same as `damat module validate`). Either failure exits non-zero.

```bash
damat module build                 # type-check + contract validate
damat module build --no-typecheck  # validate only
damat module build --no-validate   # type-check only
```

Scaffolded modules (`damat module init`) get a `"build": "damat module build"`
script, and their `README.md` / `AGENTS.md` document it as the release gate.

## Added

- `damat module build` subcommand (`--typecheck` / `--validate`, on by default).
- `--typecheck` option on `damat build` (on by default; `--no-typecheck` to skip).
- `"build"` script in the module scaffold's `package.json`.

## Changed / improved

- `damat build` type-checks the app before bundling and fails on a broken
  `damat.config.ts` (its bundle exit code was previously ignored).
- Both build commands share one type-check helper, so they behave identically.

## Breaking

- A `damat build` that previously "succeeded" on an app with type errors now
  **fails** (by design). Pass `--no-typecheck` to restore bundle-only behavior.
  Bundling itself, output layout, and all other commands are unchanged.

## Action required

- None to adopt — `damat build` type-checks by default. If a build starts failing,
  it found a real type error: fix it, or run `damat build --no-typecheck` to skip.
  Requires the app's `typescript` dev dependency (already present in scaffolds).
  Re-scaffolded modules pick up the `build` script automatically; for an existing
  module add `"build": "damat module build"` to `package.json`.

## References

- Current behavior: [CLI reference](../../docs/guide/18-cli-reference.md) and the
  [authoring-modules guide](../../docs/guide/13-authoring-modules.md) ("Build it for release").
- Source: `packages/cli/damat/src/command/build.ts`,
  `packages/cli/damat/src/command/module/build.ts`,
  `packages/cli/damat/src/command/shared/typecheck.ts`.
- Depends on `@damatjs/cli` gaining `--no-<flag>` subcommand negation (see its note).
