# @damatjs/typescript-config

> Shared TypeScript compiler presets for every package in the Damat monorepo.

This package holds the base `tsconfig` that every Damat workspace package extends, plus a couple of frontend-oriented presets. Centralizing compiler options keeps strictness, module resolution, and build output consistent across the monorepo so that individual packages only need to declare what is unique to them (their `rootDir`, `outDir`, and `types`).

It is an **internal, private** package (`"private": true`, version `0.0.0`) and is never published to npm. It is consumed only through the workspace.

Part of the [Damat](../../README.md) monorepo · [Full guide](../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

This package is internal to the monorepo and is **not published**. It is referenced from other workspace packages via the workspace protocol, so you never install it directly:

```jsonc
// some-package/package.json
{
  "devDependencies": {
    "@damatjs/typescript-config": "*",
  },
}
```

## When to use

Use it when:

- You add a new package to the monorepo and need a `tsconfig.json` — extend `@damatjs/typescript-config/base.json`.
- You want to change a compiler default for the whole monorepo at once (edit `base.json`).
- You are scaffolding a Next.js app (`nextjs.json`) or a React component library (`react-library.json`).

Do **not** use it:

- Outside this monorepo — it is private and never published.
- As a runtime dependency — it only contributes compiler settings.

## Quick start

A backend package extends the base preset and supplies only its own `rootDir`/`outDir`/`types`:

```jsonc
// packages/my-package/tsconfig.json
{
  "extends": "@damatjs/typescript-config/base.json",
  "compilerOptions": {
    "types": ["bun"],
    "rootDir": "src",
    "outDir": "dist",
  },
  "include": ["src"],
}
```

Build with the package's own script (typically `tsc` or `tsc && tsc-alias`). No extra configuration of strictness, module format, or declaration emit is needed — those come from `base.json`.

## API

This package exposes JSON preset files (referenced by relative subpath, e.g. `@damatjs/typescript-config/base.json`). There are no runtime exports.

| Export               | Kind            | Summary                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base.json`          | tsconfig preset | The shared base: `ES2023` target/lib, `ESNext` modules, `bundler` resolution, full strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUnusedLocals`), `composite`/`incremental` project builds, declaration + source maps, decorator metadata, and monorepo `paths` aliases. Emits to `${configDir}/dist`. |
| `nextjs.json`        | tsconfig preset | Extends `base.json` for Next.js apps: adds the `next` plugin, `jsx: "preserve"`, `allowJs`, `noEmit`, and frontend `paths` (`@damatjs/ui`, `@damatjs/eslint-config`, ...).                                                                                                                                                                                       |
| `react-library.json` | tsconfig preset | Extends `base.json` for React component libraries: only adds `jsx: "react-jsx"`.                                                                                                                                                                                                                                                                                 |

See [`docs/architecture.md`](./docs/architecture.md) for a field-by-field breakdown of `base.json` and the rationale behind each option.

## How it fits

- **Dependencies:** none.
- **In-repo dependents:** consumed as a `devDependency` by nearly every workspace package, including `@damatjs/deps` and `@damatjs/redis`. Backend packages (e.g. `@damatjs/framework`, `@damatjs/services`) extend `base.json` directly via their `tsconfig.json`.

## Documentation

- [Internals & architecture](./docs/README.md)
- [Full Damat guide](../../docs/GUIDE.md)

## License

MIT
