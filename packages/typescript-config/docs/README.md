# @damatjs/typescript-config — Internals

Maintainer notes for the shared TypeScript presets. This package contributes only static JSON; there is no runtime code, no `src/`, and no build step.

## Module map

| File | Responsibility |
| --- | --- |
| `package.json` | Declares the package as `private`, version `0.0.0`. No `exports` map — presets are resolved by relative path (`@damatjs/typescript-config/base.json`). |
| `base.json` | The single source of truth for compiler behaviour across the monorepo. Every backend package extends it. |
| `nextjs.json` | Frontend preset for Next.js apps. Extends `base.json`. |
| `react-library.json` | Frontend preset for React component libraries. Extends `base.json`. |
| `docs/` | This documentation. |

## Architecture overview

There is no startup or runtime flow. The "execution" happens entirely at TypeScript compile time:

1. A consuming package's `tsconfig.json` sets `"extends": "@damatjs/typescript-config/base.json"`.
2. TypeScript resolves the package through the workspace `node_modules` symlink and merges the preset's `compilerOptions`.
3. The consuming config overrides only what is package-specific (`rootDir`, `outDir`, `types`, and sometimes local `paths`).

See [`architecture.md`](./architecture.md) for the full field-by-field breakdown.

## Invariants & design decisions

- **One base, many extenders.** All monorepo strictness/output decisions live in `base.json` so they can be changed in one place. Resist duplicating options into individual package configs.
- **Project references everywhere.** `base.json` sets `composite: true` and `incremental: true`, which is what allows `tsc --build` and Turborepo caching to work. Packages that extend it inherit these — do not turn them off lightly.
- **`outDir` is relative to the extending config.** `base.json` uses `"outDir": "${configDir}/dist"`. `${configDir}` resolves to the directory of the *extending* tsconfig, so each package emits into its own `dist/` without restating the path. Packages may still restate `outDir`/`rootDir` (most do) for clarity.
- **Bun is opt-in.** `base.json` does not include `"types": ["bun"]`; backend packages add it themselves. This keeps the base usable by frontend packages that do not run on Bun.
- **Monorepo `paths` live in the base.** `base.json` defines `baseUrl: "../"` and aliases like `@damatjs/deps` → `./packages/deps/src`. These are tuned for editor/`tsc` resolution against source during development; published packages resolve through their real `exports` maps.

## Private, never published

`package.json` has `"private": true` and no `files`/`exports`. It must not be `bun add`-ed from outside the monorepo. Within the monorepo it is a `devDependency` only.

## Related docs

- [Package overview / README](../README.md)
- [Field-by-field architecture](./architecture.md)
