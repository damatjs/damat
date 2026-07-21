# @damatjs/deps

> One place to pin and re-export every external runtime dependency shared across the Damat monorepo.

`@damatjs/deps` is a thin façade over the third-party libraries the framework relies on — Hono, Zod, Effect, `pg`, `ioredis`, `nanoid`, and `uuid`. Every other Damat package imports these through `@damatjs/deps/<lib>` instead of depending on the library directly. This gives the whole monorepo a single pinned version of each dependency, a single place to upgrade, and curated re-exports (for example, the `hono` subpath bundles the framework plus its commonly used sub-modules and `@hono/node-server`'s `serve`).

Part of the [Damat](../../README.md) monorepo · [Full guide](../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/deps
```

Inside the monorepo it is referenced via the workspace protocol (`"@damatjs/deps": "*"`), so workspace packages always resolve the local copy.

## When to use

Use it when:

- You are writing a Damat package and need Hono, Zod, Effect, `pg`, `ioredis`, `nanoid`, or `uuid`. Import from `@damatjs/deps/<lib>` so you inherit the pinned version.
- You want type-only imports (`Context`, `MiddlewareHandler`, `Pool`, `RedisOptions`, ...) from the same pinned source the rest of the framework uses.

Do **not** use it:

- For dependencies that are not re-exported here (add those to your own package, or extend `@damatjs/deps` first).
- As a way to mix versions — the point is that everyone shares the version pinned in this package's `package.json`.

Prefer the **focused subpath imports** (`@damatjs/deps/zod`) over the namespaced root import. The root `@damatjs/deps` exposes each library under a namespace (`hono`, `zod`, ...) to avoid name collisions; subpaths re-export flat.

## Quick start

```ts
// Hono app + helpers, all from the pinned re-export
import { Hono, cors, serve } from "@damatjs/deps/hono";
import type { Context, MiddlewareHandler } from "@damatjs/deps/hono";

import { z } from "@damatjs/deps/zod";
import { nanoid } from "@damatjs/deps/nanoid";
import { Pool } from "@damatjs/deps/pg";

const app = new Hono();
app.use("*", cors());

const Body = z.object({ name: z.string() });

app.post("/users", async (c: Context) => {
  const data = Body.parse(await c.req.json());
  return c.json({ id: nanoid(12), ...data }, 201);
});

serve({ fetch: app.fetch, port: 3000 });
```

## API

Each entry is a subpath export. Versions are pinned in this package's `package.json`.

| Export                  | Kind                 | Summary                                                                                                                                                                                                                                                                                               |
| ----------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@damatjs/deps`         | namespace re-exports | Root entry. Re-exports every library under a namespace: `hono`, `zod`, `effect`, `pg`, `ioredis`, `nanoid`, `uuid` (e.g. `import { zod } from "@damatjs/deps"` then `zod.z`). Avoids name collisions; prefer the subpaths below.                                                                      |
| `@damatjs/deps/hono`    | curated re-export    | `hono` v4 (`Hono`, types like `Context`/`MiddlewareHandler`) **plus** `hono/utils/http-status` (`ContentfulStatusCode`, ...), `hono/http-exception` (`HTTPException`), `hono/secure-headers` (`secureHeaders`), `hono/timing` (`timing`), `hono/cors` (`cors`), and `serve` from `@hono/node-server`. |
| `@damatjs/deps/zod`     | re-export + alias    | `zod` v4 (`export * from "zod"`) plus a `z` named export (`import { z } from "@damatjs/deps/zod"`) for v3-style ergonomics.                                                                                                                                                                           |
| `@damatjs/deps/effect`  | re-export            | `effect` v3 (`export * from "effect"`).                                                                                                                                                                                                                                                               |
| `@damatjs/deps/pg`      | re-export            | node-postgres `pg` v8 (`Pool`, `Client`, ...).                                                                                                                                                                                                                                                        |
| `@damatjs/deps/ioredis` | re-export            | `ioredis` v5 (`Redis`, `RedisOptions`, ...).                                                                                                                                                                                                                                                          |
| `@damatjs/deps/nanoid`  | re-export            | `nanoid` v5 (`nanoid`, `customAlphabet`, ...).                                                                                                                                                                                                                                                        |
| `@damatjs/deps/uuid`    | re-export            | `uuid` v13 (`v4`, `v7`, ...). Also reachable via the root namespace (`import { uuid } from "@damatjs/deps"`).                                                                                                                                                                                         |

### Pinned versions (`package.json` `dependencies`)

| Library             | Pinned range    |
| ------------------- | --------------- |
| `hono`              | `^4.12.0`       |
| `@hono/node-server` | `^2.0.10`       |
| `zod`               | `4.3.6` (exact) |
| `effect`            | `^3.19.18`      |
| `pg`                | `^8.21.0`       |
| `ioredis`           | `^5.9.3`        |
| `nanoid`            | `^5.1.6`        |
| `uuid`              | `^13.0.0`       |

## How it fits

- **Dependencies:** the external libraries listed above. No `@damatjs/*` runtime dependencies.
- **In-repo dependents:** consumed by virtually every backend package. `@damatjs/framework` imports `@damatjs/deps/hono`, `/nanoid`, `/zod`; `@damatjs/services` and `@damatjs/redis` import `/zod` and `/ioredis`; ORM packages import `/pg`. It sits at the bottom of the dependency graph.

## Documentation

- [Internals & architecture](./docs/README.md)
- [Full Damat guide](../../docs/GUIDE.md)

## License

MIT
