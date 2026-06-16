# @damatjs/orm — Internals

Maintainer-facing notes for the ORM umbrella package. This package is
deliberately tiny: it is a re-export aggregator with no behaviour of its own.

- [architecture.md](./architecture.md) — the re-export model, subpath wiring,
  and how to add or change an entry point.

## Module map

| File | Responsibility |
|---|---|
| `src/index.ts` | Root `.` export — `export *` from all five sub-packages |
| `src/model.ts` | `export * from "@damatjs/orm-model"` (subpath `./model`) |
| `src/connector.ts` | `export * from "@damatjs/orm-connector"` (subpath `./connector`) |
| `src/migration.ts` | `export * from "@damatjs/orm-migration"` (subpath `./migration`) |
| `src/processor.ts` | `export * from "@damatjs/orm-processor"` (subpath `./processor`) |
| `src/pg.ts` | `export * from "@damatjs/orm-pg"` (subpath `./pg`) |
| `package.json` `exports` | Maps each subpath to its compiled `dist/*.js` + `.d.ts` |

## Architecture overview

Each source file is a single `export *` line. `tsc` compiles each `src/*.ts`
into a matching `dist/*.js` + `dist/*.d.ts`, and `package.json#exports` maps the
public subpath to those build artifacts:

```
@damatjs/orm            -> dist/index.js      (re-exports all five)
@damatjs/orm/model      -> dist/model.js      (-> @damatjs/orm-model)
@damatjs/orm/connector  -> dist/connector.js  (-> @damatjs/orm-connector)
@damatjs/orm/migration  -> dist/migration.js  (-> @damatjs/orm-migration)
@damatjs/orm/processor  -> dist/processor.js  (-> @damatjs/orm-processor)
@damatjs/orm/pg         -> dist/pg.js         (-> @damatjs/orm-pg)
```

The bare `@damatjs/orm` entry (`src/index.ts`) re-exports all five sub-packages,
so it is a superset of every subpath. The subpaths exist so consumers can import
exactly one slice and get tighter tree-shaking and clearer intent.

## Invariants / design decisions

- **No own logic.** Nothing should live in `src/` except `export *` lines. Any
  real code belongs in the relevant `@damatjs/orm-*` sub-package.
- **Subpath ↔ file ↔ dependency parity.** For every subpath in
  `package.json#exports` there must be a `src/<name>.ts` re-exporting the
  matching `@damatjs/orm-<name>` package, and that package must be listed in
  `dependencies`.
- **`test` is a no-op** (`"test": "exit 0"`) — the real tests live in each
  sub-package and in `@damatjs/orm-pg`'s integration suite. Build is just `tsc`.
- **Name collisions** between sub-packages would surface here as duplicate
  `export *` symbols. Today the five packages export disjoint names; introducing
  an overlap would require an explicit re-export with renaming.

## Safe-extension guidance

To add a new sub-package to the umbrella (e.g. `@damatjs/orm-foo`):

1. Add `@damatjs/orm-foo` to `dependencies` in `package.json`.
2. Create `src/foo.ts` with `export * from "@damatjs/orm-foo"`.
3. Add `export * from "@damatjs/orm-foo"` to `src/index.ts`.
4. Add the subpath to `package.json#exports`:
   ```jsonc
   "./foo": { "types": "./dist/foo.d.ts", "default": "./dist/foo.js" }
   ```
5. Confirm the new package's exported names do not collide with existing ones.

To document the umbrella, update the API table in the package
[README](../README.md) — keep it in lockstep with `package.json#exports`.
