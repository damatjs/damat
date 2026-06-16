# Architecture — @damatjs/deps

A reference for exactly what each subpath re-exports and how the package is wired.

## The `exports` map

The published contract is the `exports` field in `package.json`. Each subpath maps to a built file:

```jsonc
"exports": {
  ".":        { "types": "./dist/index.d.ts",  "default": "./dist/index.js" },
  "./effect": { "types": "./dist/effect.d.ts", "default": "./dist/effect.js" },
  "./pg":     { "types": "./dist/pg.d.ts",     "default": "./dist/pg.js" },
  "./hono":   { "types": "./dist/hono.d.ts",   "default": "./dist/hono.js" },
  "./uuid":   { "types": "./dist/uuid.d.ts",   "default": "./dist/uuid.js" },
  "./zod":    { "types": "./dist/zod.d.ts",     "import": "./dist/zod.js", "default": "./dist/zod.js" },
  "./ioredis":{ "types": "./dist/ioredis.d.ts","default": "./dist/ioredis.js" },
  "./nanoid": { "types": "./dist/nanoid.d.ts", "default": "./dist/nanoid.js" }
}
```

## Subpath contents

### `@damatjs/deps` (root, `src/index.ts`)

```ts
export * as hono from "./hono";
export * as zod from "./zod";
export * as effect from "./effect";
export * as pg from "./pg";
export * as ioredis from "./ioredis";
export * as nanoid from "./nanoid";
export * as uuid from "./uuid";
```

Every library under a namespace. Usage: `import { zod } from "@damatjs/deps"; zod.z.object({...})`.

### `@damatjs/deps/hono` (`src/hono.ts`)

```ts
export * from "hono";
export * from "hono/utils/http-status";
export * from "hono/http-exception";
export * from "hono/secure-headers";
export * from "hono/timing";
export * from "hono/cors";
export { serve } from "@hono/node-server";
```

Provides: `Hono`, type `Context`, type `MiddlewareHandler`, type `Next`, HTTP-status types (`ContentfulStatusCode`, ...), `HTTPException`, `secureHeaders`, `timing`, `cors`, and `serve`. This is the surface the framework's middleware, router, server, and handlers consume.

### `@damatjs/deps/zod` (`src/zod.ts`)

```ts
export * from "zod";
import * as zod from "zod";
export { zod as z };
```

Re-exports zod v4 flat **and** binds a `z` namespace alias so `import { z } from "@damatjs/deps/zod"` works (v3-compatible ergonomics).

### `@damatjs/deps/effect` (`src/effect.ts`)

```ts
export * from "effect";
```

The full Effect-TS surface (`Effect`, `Layer`, `pipe`, ...).

### `@damatjs/deps/pg` (`src/pg.ts`)

```ts
export * from "pg";
```

node-postgres: `Pool`, `Client`, `PoolClient`, types, etc.

### `@damatjs/deps/ioredis` (`src/ioredis.ts`)

```ts
export * from "ioredis";
```

`Redis`, type `RedisOptions`, etc. (used by `@damatjs/redis`).

### `@damatjs/deps/nanoid` (`src/nanoid.ts`)

```ts
export * from "nanoid";
```

`nanoid`, `customAlphabet`, etc. (used by the framework for request IDs).

### `@damatjs/deps/uuid` (`src/uuid.ts`)

```ts
export * from "uuid";
```

`v4`, `v7`, `validate`, etc. Reachable via the `@damatjs/deps/uuid` subpath and via the root namespace (`import { uuid } from "@damatjs/deps"`).

## Pinned versions

From `package.json` `dependencies`:

| Library | Range | Notes |
| --- | --- | --- |
| `hono` | `^4.12.0` | Core HTTP framework. |
| `@hono/node-server` | `^1.13.7` | `serve` adapter (re-exported from the `hono` subpath). |
| `zod` | `4.3.6` | **Exact pin** (no caret) for validator/error stability. |
| `effect` | `^3.19.18` | Effect-TS. |
| `pg` | `^8.21.0` | node-postgres. |
| `ioredis` | `^5.9.3` | Redis client. |
| `nanoid` | `^5.1.6` | ID generation. |
| `uuid` | `^13.0.0` | UUID generation. |

`devDependencies` include `@types/pg`, `@types/bun`, `@damatjs/typescript-config`, and `typescript`.

## Build

```jsonc
"scripts": { "build": "rm -rf dist tsconfig.tsbuildinfo && tsc --build" }
```

`tsconfig.json` extends `@damatjs/typescript-config/base.json` and sets `types: ["bun"]`, `rootDir: src`, `outDir: dist`. Because the base sets `composite: true`, the package is built with `tsc --build` and produces `.d.ts` + `.js` per `src/*.ts`.

## Known gaps

- **`zod` subpath has an extra `import` condition** alongside `default` (both point at `dist/zod.js`); the other subpaths only use `types` + `default`. This is harmless but inconsistent.
