# @damatjs/auth-better-auth

> [Better Auth](https://better-auth.com) provider for Damat — full in-backend
> auth, wired into the framework via `services.auth`.

Better Auth runs _inside_ your backend: it serves its own sign-in/sign-up/session
endpoints and stores users/sessions in your Postgres. This adapter mounts those
endpoints and verifies sessions, producing the Damat request principal. It reads
and writes only the tables it is **told** about — it creates none.

Part of the [Damat](../../../README.md) monorepo · contract: [`@damatjs/auth`](../core/README.md).

## Install & set up

```bash
# 1. scaffold the storage tables (a Damat module you own) and apply them
damat auth init better-auth
bun add @damatjs/auth-better-auth @damatjs/auth better-auth
bun damat-orm migrate:create auth_init && bun damat-orm migrate:up

# 2. turn it on
```

```ts
// damat.config.ts
services: {
  auth: {
    provider: "better-auth",
    options: {
      secret: process.env.BETTER_AUTH_SECRET,   // or BETTER_AUTH_SECRET env
      baseURL: process.env.BETTER_AUTH_URL,
      // database is injected by the framework (the app's pool)
      // tables default to user/session/account/verification — override if renamed
    },
  },
}
```

Better Auth's endpoints are served at `/api/auth/*`; routes with `auth: "session"`
populate `c.get("user")`.

## Options (`BetterAuthAdapterOptions`)

| Option               | Purpose                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth`               | A pre-built Better Auth instance — the escape hatch for plugins, social providers, custom fields. When set, the build options below are ignored. |
| `secret` / `baseURL` | Signing secret / public base URL (fall back to `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`).                                                        |
| `basePath`           | Where the endpoints mount (default `/api/auth`).                                                                                                 |
| `database`           | The `pg` Pool (the framework injects the app's pool).                                                                                            |
| `emailAndPassword`   | Enable the built-in email+password flow (default true).                                                                                          |
| `tables`             | `{ user?, session?, account?, verification? }` — names of the existing tables the storage module created.                                        |

`createBetterAuthProvider(options)` is exported for standalone use; the default
export is the framework adapter factory.

## License

MIT
