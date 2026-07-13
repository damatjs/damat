# @damatjs/deps — Internals

Maintainer notes for the dependency re-export package. It is intentionally tiny: each `src/*.ts` file is a re-export, and the value is concentrated in the `package.json` (pinned versions + the `exports` map).

## Module map

| File             | Responsibility                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`   | Root entry. Namespace re-exports (`export * as hono`, `export * as zod`, ...) so the root import works without collisions.                     |
| `src/hono.ts`    | Curated Hono surface: core `hono` + `http-status`, `http-exception`, `secure-headers`, `timing`, `cors`, and `serve` from `@hono/node-server`. |
| `src/zod.ts`     | `export * from "zod"` + a `z` alias for v3-style usage.                                                                                        |
| `src/effect.ts`  | `export * from "effect"`.                                                                                                                      |
| `src/pg.ts`      | `export * from "pg"`.                                                                                                                          |
| `src/ioredis.ts` | `export * from "ioredis"`.                                                                                                                     |
| `src/nanoid.ts`  | `export * from "nanoid"`.                                                                                                                      |
| `src/uuid.ts`    | `export * from "uuid"`. Reachable via the `./uuid` subpath and the root namespace.                                                             |
| `package.json`   | The real contract: pinned dependency versions + the `exports` map mapping each subpath to its built `dist/*.js` / `*.d.ts`.                    |
| `tsconfig.json`  | Extends `@damatjs/typescript-config/base.json`, adds `types: ["bun"]`, `rootDir: src`, `outDir: dist`.                                         |

## Architecture overview

There is no runtime logic — `@damatjs/deps` is a compile-time/dependency-management indirection layer.

```
consumer package
   │  import { Hono } from "@damatjs/deps/hono"
   ▼
@damatjs/deps/hono  (dist/hono.js)
   │  export * from "hono"; export { serve } from "@hono/node-server"; ...
   ▼
real libraries pinned in @damatjs/deps/package.json
```

Build: `rm -rf dist tsconfig.tsbuildinfo && tsc --build`. Each `src/*.ts` compiles to a matching `dist/*.js` + `.d.ts`, which the `exports` map points at.

## Startup / request flow

Not applicable — this package contributes no runtime behaviour. Its "flow" is entirely module resolution: a consumer's `@damatjs/deps/<sub>` import is resolved by Node/Bun through this package's `exports` map to the corresponding `dist/<sub>.js`, which re-exports the underlying library.

## Invariants & design decisions

- **Single source of truth for versions.** Every shared external dependency is pinned exactly once here. Other packages depend on `@damatjs/deps` (workspace `*`) instead of the library, so upgrades happen in one `package.json`. `zod` is pinned to an **exact** version (`4.3.6`, no caret) because subtle behavioural changes ripple through validators and error handling across the framework.
- **Subpaths over root.** The root `index.ts` re-exports under namespaces (`export * as hono`) specifically to prevent name collisions (e.g. both `hono` and `effect` could export overlapping identifiers). Subpath imports (`@damatjs/deps/hono`) are flat and preferred in consumer code.
- **Curated Hono surface.** `src/hono.ts` is the only non-trivial file: it pulls together the Hono sub-modules the framework actually uses (`cors`, `secureHeaders`, `timing`, `HTTPException`, HTTP-status types) plus `serve` from `@hono/node-server`, so the framework can `import { Hono, cors, serve, HTTPException } from "@damatjs/deps/hono"` from one place.
- **`z` alias for ergonomics.** `src/zod.ts` adds `export { zod as z }` so existing v3-style `z.object(...)` code keeps working against zod v4.
- **`exports` map must mirror `src/`.** When adding a new library, you must add both a `src/<lib>.ts` re-export **and** a `./<lib>` entry in `package.json` `exports`, otherwise the deep import will not resolve in published builds.

## Safe extension guidance

To add a new shared dependency `foo`:

1. Add `"foo": "<pinned>"` to `dependencies` in `package.json` (use an exact version if behaviour stability matters, as with `zod`).
2. Create `src/foo.ts` with `export * from "foo"` (or a curated subset, as `src/hono.ts` does).
3. Add a `"./foo"` entry to the `exports` map pointing at `./dist/foo.js` / `./dist/foo.d.ts`.
4. Optionally add `export * as foo from "./foo";` to `src/index.ts` for root-namespace access.
5. Rebuild.

## Related docs

- [Package overview / README](../README.md)
- [Full architecture reference](./architecture.md)
