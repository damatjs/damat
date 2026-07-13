# @damatjs/auth-clerk

> [Clerk](https://clerk.com) provider for Damat — verify Clerk sessions in the
> backend, no local storage.

Clerk is hosted: sign-in happens on Clerk, and your backend only **verifies** the
incoming session token (bearer or cookie) via `@clerk/backend`. There are no
provider routes and no tables to scaffold. `orgId` becomes the request team.

Part of the [Damat](../../../README.md) monorepo · contract: [`@damatjs/auth`](../core/README.md).

## Install & set up

```bash
bun add @damatjs/auth-clerk @damatjs/auth @clerk/backend
```

```ts
// damat.config.ts
services: {
  auth: {
    provider: "clerk",
    options: {
      secretKey: process.env.CLERK_SECRET_KEY,          // or CLERK_SECRET_KEY env
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY, // optional
      authorizedParties: ["https://app.example.com"],    // optional
    },
  },
}
```

Routes with `auth: "session"` verify the Clerk token and populate `c.get("user")`
(`{ id: userId, orgId, email, …claims }`) and `c.get("team")`.

## Options (`ClerkAdapterOptions`)

| Option | Purpose |
| --- | --- |
| `client` | A pre-built Clerk client (escape hatch); when set, the keys below are ignored. |
| `secretKey` / `publishableKey` | Clerk keys (fall back to `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY`). |
| `authorizedParties` | Origins allowed to present tokens (passed to `authenticateRequest`). |

## License

MIT
