# Architecture — @damatjs/typescript-config

A field-by-field reference for the three presets. All paths are relative to the package root.

## `base.json`

The shared base every backend package extends. Full contents:

```jsonc
{
  "compilerOptions": {
    "lib": ["ES2023"],
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "isolatedModules": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "incremental": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "${configDir}/dist",
    "noUnusedLocals": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": "../",
    "paths": { /* monorepo aliases, see below */ }
  },
  "include": ["${configDir}/src"],
  "exclude": [
    "${configDir}/dist",
    "${configDir}/node_modules",
    "${configDir}/**/*.test.ts",
    "${configDir}/**/*.test.tsx",
    "${configDir}/**/*.spec.ts",
    "${configDir}/**/*.spec.tsx",
    "${configDir}/**/tests/**",
    "${configDir}/**/__tests__/**",
    "${configDir}/**/__mocks__/**",
    "${configDir}/**/__fixtures__/**",
    "${configDir}/**/__snapshots__/**"
  ]
}
```

`include`/`exclude` are written with `${configDir}` so they apply to the
**extending** package's own tree: only its `src/` is compiled, and its build
output, dependencies, and test/mock/fixture/snapshot files are kept out of the
emitted declaration build.

### Why each option

| Option | Effect / rationale |
| --- | --- |
| `target` / `lib` `ES2023` | Targets a modern runtime (Bun / current Node). No down-leveling. |
| `module: "ESNext"` + `moduleResolution: "bundler"` | The monorepo ships pure ESM (`"type": "module"`). `bundler` resolution allows extensionless imports while still honouring `exports` maps. |
| `moduleDetection: "force"` | Treats every file as a module, avoiding accidental global scripts. |
| `isolatedModules: true` | Guarantees every file can be transpiled standalone (required for fast per-file tooling and Bun). |
| `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitReturns` + `noUnusedLocals` | Maximum type safety. `noUncheckedIndexedAccess` is why index/array access in the source is frequently guarded (e.g. router/scanner code uses `?`/`!`). `exactOptionalPropertyTypes` is why many optional fields are typed as `T | undefined` explicitly. |
| `composite: true` + `incremental: true` | Enables TypeScript project references and `.tsbuildinfo` caching — the foundation for `tsc --build` and Turborepo's incremental builds. |
| `declaration` + `declarationMap` + `sourceMap` | Emit `.d.ts`, declaration maps, and source maps for every package so published types and go-to-definition work. |
| `emitDecoratorMetadata` + `experimentalDecorators` | Enables decorator syntax + runtime metadata (used by ORM/model code in the monorepo). |
| `esModuleInterop` + `resolveJsonModule` | Smooth CJS interop and JSON imports. |
| `skipLibCheck` | Skips type-checking of `.d.ts` dependencies to keep builds fast. |
| `forceConsistentCasingInFileNames` | Avoids cross-platform casing bugs. |
| `outDir: "${configDir}/dist"` | `${configDir}` expands to the directory of the **extending** config, so each package emits to its own `dist/` without re-declaring the path. |
| `baseUrl: "../"` + `paths` | Resolve `@damatjs/*` imports to package `src/` during development so editor/`tsc` can follow types before a build exists. |

### `paths` aliases in `base.json`

```jsonc
"baseUrl": "../",
"paths": {
  "@damatjs/backend":        ["./backend/default/src"],
  "@damatjs/deps":           ["./packages/deps/src"],
  "@damatjs/deps/*":         ["./packages/deps/src/*"],
  "@damatjs/service":        ["./packages/service/src"],
  "@damatjs/types":          ["./packages/core/types/src"],
  "@damatjs/cli/*":          ["./packages/cli/*"],
  "@damatjs/core/*":         ["./packages/core/*"],
  "@damatjs/workflow-engine":["./packages/workflow-engine/src"]
}
```

`baseUrl` is `../` because, after the workspace symlinks the package into `node_modules/@damatjs/typescript-config`, the relative `./packages/...` targets need to climb back to the repo root context. These aliases are a dev-time convenience for the editor and `tsc`; at runtime, packages resolve each other through their published `exports` maps, not these `paths`.

> Note: the alias is `@damatjs/service` (singular), while the published service package is `@damatjs/services` (plural). Packages that import the service layer at runtime use the real package name `@damatjs/services`.

## `nextjs.json`

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "jsx": "preserve",
    "noEmit": true,
    "baseUrl": "../",
    "paths": {
      "@damatjs/ui": ["./packages/ui/src"],
      "@damatjs/typescript-config": ["./packages/typescript-config/src"],
      "@damatjs/eslint-config": ["./packages/eslint-config/src"],
      "@damatjs/tailwind-config": ["./packages/tailwind-config/src"]
    }
  }
}
```

For Next.js apps. `noEmit: true` (Next.js owns the build), `jsx: "preserve"` (Next.js transforms JSX), `allowJs`, the official `next` TS plugin, and frontend-oriented `paths`. The `extends: "./base.json"` is a relative path because both files live in this package.

## `react-library.json`

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

The minimal preset for a React component library: inherits everything from `base.json` and only switches `jsx` to the automatic runtime (`react-jsx`), so components do not need to import `React` explicitly.

## Extending these presets

- **Backend / library package:** extend `base.json`, add `"types": ["bun"]`, set `rootDir`/`outDir`, and `include: ["src"]`. See `packages/deps/tsconfig.json` and `packages/framework/tsconfig.json` for working examples.
- **Local path aliases:** if a package uses `@/...` imports, add a local `paths` block (see `packages/service/tsconfig.json`, which maps `@/*` → `src/*` and relies on `tsc-alias` to rewrite them in the emitted output).
- **Next.js app:** extend `nextjs.json`.
- **React component library:** extend `react-library.json`.
