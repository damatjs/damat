[Damat Guide](../GUIDE.md) › Authentication

# 8b. Authentication

Damat ships an auth service contract and framework request binding, not an
identity engine or vendor adapter. An auth provider is an ordinary module: it
owns its schema, credentials, migrations, routes, workflows, and persistence,
and its service implements the standardized auth operations.

## Author an auth module

The strict base extends `ModuleService`, so models, generated accessors,
transactions, cache, events, and credential validation remain available.

```ts
import { AuthProviderService } from "@damatjs/provider-auth";
import { models } from "./models";

const Base = AuthProviderService({ models });

export class AuthService extends Base {
  async authenticate(credentials) {
    const claims = credentials.bearerToken
      ? await verifyToken(credentials.bearerToken)
      : null;
    return claims ? { id: claims.sub, email: claims.email } : null;
  }

  getPrincipal(id) {
    return this.users.findById(id);
  }

  async issueApiKey(input) {
    return issueAndStoreDigest(input);
  }

  getApiKey(id) {
    return findSafeKeyRecord(id);
  }

  listApiKeys(input) {
    return listSafeKeyRecords(input);
  }

  async verifyApiKey(credentials) {
    return credentials.apiKey ? verifyStoredDigest(credentials.apiKey) : null;
  }

  async revokeApiKey(id) {
    await this.apiKeys.update({ where: { id }, data: { revoked: true } });
  }
}
```

API-key inspection returns `ApiKeyRecord`, which never contains a secret.
Only `issueApiKey` and optional rotation return an `IssuedApiKey.secret`, once;
the module must store a one-way digest. The framework's normalized request
credentials and nested header/cookie views redact themselves during JSON
serialization.

A concrete subclass missing a required operation fails TypeScript compilation.
An ordinary `ModuleService` with the same methods is also accepted at startup;
the strict base is the safer authoring path, not a runtime inheritance rule.

Sign-up, sign-in, OAuth, recovery, and API-key management endpoints remain
normal module routes and workflows. The framework creates no public API-key
issue, revoke, or rotate routes.

## Bind the module

Install and configure it exactly like every other module, then select that same
module service for the auth role:

```ts
modules: {
  auth: { resolve: "./src/modules/auth" },
},
providers: {
  auth: { module: "auth" },
},
```

Startup initializes the module once and binds `providers.auth` to the exact
same service object. A missing module, a service marked for a different role,
or a missing auth operation fails startup. `getProvider("auth")` returns the
typed bound service.

## Protect routes

Protection stays explicit. Installing or binding auth does not silently guard
all routes.

```ts
import { defineRoute, getUser } from "@damatjs/framework";

export const config = { method: "GET", auth: { type: "session" } };
export const GET = defineRoute((context) =>
  context.json({ success: true, data: getUser(context) }),
);
```

Use `session`, `apiKey`, or `flexible`; a global `projectConfig.http.auth` is
also available. Protected routes fail closed with the standard 401 response
when no auth provider is bound. Public routes remain public unless configured.

The framework supplies transport-neutral credentials with lower-cased headers,
parsed cookies, a bearer token, and `x-api-key`. Verification errors and
malformed principals fail closed. Framework logs and serialization redact the
credentials, and successful verification populates `user`, `userId`, and the
optional organization `team` in request context.

Full contract: [`@damatjs/provider-auth`](../../provider/auth/README.md).

---

Prev: [← Building HTTP APIs](./08-http-apis.md) · [Guide home](../GUIDE.md) · Next: [Integration providers →](./08c-providers.md)
