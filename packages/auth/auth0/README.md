# @damatjs/auth-auth0

> [Auth0](https://auth0.com) provider for Damat — verify Auth0 access tokens via
> JWKS, no local storage.

Auth0 is hosted: your backend **verifies** the access-token JWT against the
tenant's JWKS (using [`jose`](https://github.com/panva/jose)) and reads its
claims. Bearer-token only — no cookie session, no provider routes, no tables.
`sub` becomes the principal id, `org_id` the request team.

Part of the [Damat](../../../README.md) monorepo · contract: [`@damatjs/auth`](../core/README.md).

## Install & set up

```bash
bun add @damatjs/auth-auth0 @damatjs/auth jose
```

```ts
// damat.config.ts
services: {
  auth: {
    provider: "auth0",
    options: {
      domain: process.env.AUTH0_DOMAIN,      // or AUTH0_DOMAIN env, e.g. tenant.us.auth0.com
      audience: process.env.AUTH0_AUDIENCE,  // the API identifier the token must be for
    },
  },
}
```

Requests present `Authorization: Bearer <access-token>`; verified requests
populate `c.get("user")` (`{ id: sub, email, orgId, …claims }`).

## Options (`Auth0AdapterOptions`)

| Option | Purpose |
| --- | --- |
| `domain` | Auth0 tenant domain (falls back to `AUTH0_DOMAIN`). |
| `audience` | API identifier the access token must target (falls back to `AUTH0_AUDIENCE`). |
| `issuer` | Token issuer (default `https://<domain>/`). |
| `jwksUri` | JWKS endpoint (default `https://<domain>/.well-known/jwks.json`). |
| `emailClaim` / `orgClaim` | Claim names for email / org — set these for namespaced custom claims (e.g. `https://app/email`). |

## License

MIT
