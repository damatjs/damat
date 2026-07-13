# @damatjs/auth

> The provider-agnostic auth contract for Damat. Verify sessions/tokens from
> **Better Auth, Clerk, Auth0 — or your own provider** and populate the request
> principal, wired into the framework's existing auth middleware.

Damat doesn't ship its own identity system — it integrates the ones you already
trust. `@damatjs/auth` is the small shared core: the `AuthProvider` contract every
adapter implements, the middleware factory that turns a provider into the
framework's session/apiKey/flexible handlers, and helpers for **building your own**
provider. It never touches your database schema.

Part of the [Damat](../../../README.md) monorepo.

## Install

You usually install an **adapter**, which pulls this core in transitively:

```bash
bun add @damatjs/auth-better-auth @damatjs/auth better-auth   # or -clerk / -auth0
```

Then turn it on in `damat.config.ts` — nothing is imported unless you do:

```ts
services: {
  auth: {
    provider: "better-auth",                 // → @damatjs/auth-better-auth
    options: { secret: process.env.BETTER_AUTH_SECRET },
    onAuthenticated: (user) => { /* optional: upsert a local row via your service */ },
  },
}
```

Every route declaring `auth: "session"` (or `apiKey` / `flexible`) now verifies
through the provider, and `c.get("user")` / `c.get("team")` are populated — see
[the framework's typed context](../../framework/README.md).

## Build your own provider

Any auth system — a homegrown JWT service, a corporate SSO, another vendor — can
plug in with the same contract. Two steps:

**1. Implement the contract.** `defineAuthProvider` type-checks it as you write:

```ts
import { defineAuthProvider } from "@damatjs/auth";

export const myProvider = defineAuthProvider({
  name: "my-idp",
  async authenticate(c) {                     // verify the request → principal | null
    const token = c.req.header("authorization")?.replace(/^Bearer /, "");
    const claims = token ? await verifyWithMyIdp(token) : null;
    return claims ? { id: claims.sub, email: claims.email, orgId: claims.org } : null;
  },
  // optional: authenticateApiKey(c), routes: { basePath, handler }, shutdown()
});
```

**2. Publish it as a package with a default-export factory** (`defineAuthAdapter`
gives it the right type):

```ts
// @my-org/auth-my-idp  —  src/index.ts
import { defineAuthAdapter, defineAuthProvider } from "@damatjs/auth";

export default defineAuthAdapter((options) =>
  defineAuthProvider({
    name: "my-idp",
    authenticate: async (c) => { /* use options.* to verify */ },
  }),
);
```

Point the config at your package name (a value containing `/` is loaded verbatim):

```ts
services: { auth: { provider: "@my-org/auth-my-idp", options: { /* your options */ } } }
```

That's it — the framework dynamically imports your package, builds the provider,
and wires it exactly like the official adapters. You never touch middleware,
context keys, or the router.

## The contract

| Export | Kind | Summary |
| --- | --- | --- |
| `AuthProvider` | interface | `authenticate(c) → principal \| null`, optional `authenticateApiKey`, `routes` (provider-owned endpoints, e.g. Better Auth), `shutdown`. |
| `AuthPrincipal` | interface | `{ id, email?, orgId?, …claims }` — structurally the framework's `AuthUser`; `orgId` becomes the request team. |
| `defineAuthProvider(provider)` | function | Identity helper: type-checks a provider object against the contract. |
| `defineAuthAdapter(factory)` | function | Identity helper for an adapter's default export (`(options) => AuthProvider`). |
| `createAuthHandlers(provider, options?)` | function | Build `{ session, apiKey, flexible }` middleware from a provider (used by the framework; also usable standalone). |
| `setPrincipal(c, principal)` | function | Put a principal on the request context (`user`/`userId`/`team`). |
| `AuthServiceConfig`, `AuthAdapterFactory`, `OnAuthenticated` | types | Config + factory shapes. |

## Semantics

- **Error isolation.** A thrown verification error is treated as unauthenticated
  (401 + a warn log), never a 500 — a bad or expired token must not crash the
  request.
- **`flexible`** tries the session path, then the API-key path.
- **`onAuthenticated`** fires once per verified request; a throwing hook is logged
  but never fails the request.
- **No schema.** The core (and every adapter) reads/verifies only — persistence,
  where a provider needs it, is a module you own (`damat auth init better-auth`).

## How it fits

**Depends on**: `@damatjs/logger`, `@damatjs/deps` (Hono types). **Consumed by**:
`@damatjs/auth-better-auth` / `-clerk` / `-auth0` (and your own adapters), and
`@damatjs/framework` (which loads adapters on demand via `services.auth`).

## License

MIT
