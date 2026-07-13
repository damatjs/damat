[Damat Guide](../GUIDE.md) › Authentication

# 8b. Authentication

Damat doesn't ship its own identity system — it **integrates the ones you already
trust**. You turn on a provider in config, and every route that declares auth gets
a verified `c.get("user")`. It's fully opt-in: an app that doesn't configure auth
pulls in no auth packages at all.

Three providers are supported out of the box —
[Better Auth](../../packages/auth/better-auth/README.md) (runs in your backend),
[Clerk](../../packages/auth/clerk/README.md) and
[Auth0](../../packages/auth/auth0/README.md) (hosted, verify-only) — and you can
[build your own](#build-your-own-provider) on the same contract.

## Turning a provider on

Two steps: install the adapter (+ its SDK), then add a `services.auth` block to
`damat.config.ts`.

```ts
services: {
  auth: {
    provider: "better-auth",                       // → @damatjs/auth-better-auth
    options: { secret: process.env.BETTER_AUTH_SECRET },
    onAuthenticated: (user) => userService.upsert({ where: { id: user.id }, ... }), // optional
  },
}
```

`provider` names the adapter package the framework loads **dynamically** — nothing
is imported unless this block is present. On boot the framework builds the
provider, feeds its handlers into the router's existing auth system, mounts any
provider-owned routes, and populates the request context.

### Protecting routes

Auth is declared **per route/method** with the same `auth` types the router
already has — the provider supplies the handler behind them:

```ts
// src/api/routes/me/route.ts
import { defineRoute, getUser } from "@damatjs/framework";

export const config = { GET: { auth: "session" } };   // "session" | "apiKey" | "flexible" | "none"

export const GET = defineRoute((c) => {
  const user = getUser(c);            // typed AuthUser — set by the provider
  return c.json({ success: true, data: { id: user!.id, email: user!.email } });
});
```

`getUser(c)` / `getTeam(c)` / `getRequestLogger(c)` read the typed context; an
unauthenticated request never reaches the handler (the middleware returns the
standard `401 UNAUTHORIZED` envelope). `flexible` accepts either a session or an
API key.

## The three providers

### Better Auth — in your backend

Better Auth runs *inside* your server: it serves sign-in/sign-up/session endpoints
(mounted at `/api/auth/*`) and stores users in your Postgres. Because Damat never
manages schema, its tables come from a **module you own** — scaffold it once:

```bash
damat auth init better-auth                       # writes src/modules/auth (models + service)
bun add @damatjs/auth-better-auth @damatjs/auth better-auth
bun damat-orm migrate:create auth_init && bun damat-orm migrate:up
```

The adapter is then told those table names (they're the defaults) and reads/writes
them — it creates nothing. See the
[adapter README](../../packages/auth/better-auth/README.md).

### Clerk & Auth0 — hosted

Sign-in happens on the provider; your backend only **verifies** the incoming
token. No tables, no routes — `damat auth init clerk` just tells you so.

```bash
bun add @damatjs/auth-clerk @damatjs/auth @clerk/backend   # Clerk (verifies the session token)
bun add @damatjs/auth-auth0 @damatjs/auth jose             # Auth0 (verifies the access-token JWT via JWKS)
```

Both map their claims into the principal (`orgId` → the request team). Config
options are in the [Clerk](../../packages/auth/clerk/README.md) and
[Auth0](../../packages/auth/auth0/README.md) READMEs.

## Build your own provider

Any auth system — homegrown JWTs, corporate SSO, another vendor — plugs in with
the same contract via [`@damatjs/auth`](../../packages/auth/core/README.md). An
adapter is a package whose default export builds an `AuthProvider`:

```ts
// @my-org/auth-my-idp  —  src/index.ts
import { defineAuthAdapter, defineAuthProvider } from "@damatjs/auth";

export default defineAuthAdapter((options) =>
  defineAuthProvider({
    name: "my-idp",
    async authenticate(c) {                          // verify → principal | null
      const token = c.req.header("authorization")?.replace(/^Bearer /, "");
      const claims = token ? await verifyWithMyIdp(token, options) : null;
      return claims ? { id: claims.sub, email: claims.email, orgId: claims.org } : null;
    },
    // optional: authenticateApiKey(c), routes: { basePath, handler }, shutdown()
  }),
);
```

Point the config at your package name (a value containing `/` is loaded verbatim):

```ts
services: { auth: { provider: "@my-org/auth-my-idp", options: { /* yours */ } } }
```

The framework wires it exactly like the official adapters — you never touch the
middleware, the context keys, or the router.

## What to know

- **Optional by design.** No `services.auth` → no auth package imported. A
  provider set but not installed fails boot with a clear `bun add …` message.
- **No schema, ever.** Adapters only verify/read; persistence (Better Auth) is a
  module *you* own and migrate. The adapter is told the names and assumes the
  tables exist.
- **Errors are 401, not 500.** A bad/expired token is treated as unauthenticated
  (with a warn log), never a crash.
- **`onAuthenticated`** fires once per verified request — the place to sync a
  local user row via your own service; a throwing hook is logged, never fatal.
- **Typed context.** `c.get("user")` / `c.get("team")` / `c.get("userId")` are
  typed app-wide by the framework — see [Building HTTP APIs](./08-http-apis.md).

Full contract and helpers: the [`@damatjs/auth`](../../packages/auth/core/README.md)
README.

---

Prev: [← Building HTTP APIs](./08-http-apis.md) · [Guide home](../GUIDE.md) · Next: [Workflows →](./09-workflows.md)
