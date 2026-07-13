[Damat Guide](../GUIDE.md) › Configuration & environment

# 4. Configuration & environment

Everything starts in **`damat.config.ts`**. `defineConfig` gives you a typed
config; `projectConfig` configures the server/DB/logging, and `modules`
registers each module by id.

```ts
import { defineConfig } from "@damatjs/framework";

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL,
    nodeEnv: "development",
    loggerConfig: {
      level: "debug",
      format: "pretty", // "json" | "pretty" | "simple"
      timestamp: true,
      prefix: "server",
    },
    http: {
      port: Number(process.env.PORT) || 6543,
      host: process.env.HOST || "0.0.0.0",
      corsConfig: process.env.FRONTEND_CORS,
    },
  },
  // `modules` is an OBJECT keyed by module id (not an array):
  modules: {
    user: {
      resolve: "./src/modules/user", // path to the module's folder
      id: "user",
    },
  },
});
```

> **Heads up:** older docs showed `modules` as an array — it is now a keyed
> object `{ [id]: { resolve, id } }`. When you install a module with
> `damat module add`, this block is updated for you.

See [`@damatjs/framework` → config internals](../../packages/framework/docs/config.md)
for the full `ProjectConfig`/`HttpConfig` type reference.

## Environment variables

Env loading ([`@damatjs/load-env`](../../packages/core/env/README.md)) cascades,
so local overrides win:

```
.env.{environment}.local   ← highest priority
.env.{environment}
.env.local
.env                       ← lowest
```

Common variables (see the default backend's `.env.example` for the full set):

| Variable                | Required | Description                                             |
| ----------------------- | -------- | ------------------------------------------------------- |
| `DATABASE_URL`          | ✅       | PostgreSQL connection string                            |
| `REDIS_URL`             | —        | Redis URL (enables cache/queues/locks/rate limiting)    |
| `NODE_ENV`              | —        | `development` \| `production` \| `test`                 |
| `PORT` / `HOST`         | —        | HTTP bind                                               |
| `BETTER_AUTH_SECRET`    | ✅*      | Auth secret (min 32 chars) — _if using the auth module_ |
| `DAMAT_MODULE_REGISTRY` | —        | Module registry index (for `module add` / MCP)          |
| `DAMAT_MODULE_VERIFY`   | —        | `off` \| `warn` \| `require` install policy             |

Modules declare their own env vars in `module.json`; `damat module add` syncs
them into `.env.example` for you (see [Authoring a module](./13-authoring-modules.md)).

## The mental model

Damat has four layers you compose — models, services, modules, and
routes/workflows. If you haven't read it yet,
[Concepts](./02-concepts.md) explains how they fit together and how the
framework wires them at startup.

---

Prev: [← Getting started](./03-getting-started.md) · [Guide home](../GUIDE.md) · Next: [Defining models →](./05-models.md)
