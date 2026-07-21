# `@damatjs/provider-auth`

Strict authentication provider contracts for ordinary Damat module services.

Extend `AuthProviderService({ models, credentialsSchema, ... })` to retain the
full `ModuleService` database, transaction, cache, event, credential, and model
accessor behavior while making every auth operation mandatory at compile time.
An ordinary `ModuleService` with the same methods is also valid at runtime.

Provider-owned sign-in, sign-up, OAuth, recovery, and API-key management routes
remain normal module routes. Bind the installed module with
`providers.auth.module`; installation alone does not protect HTTP routes.

The required service surface covers request authentication, principal lookup,
and a complete inspectable API-key lifecycle:

- `authenticate` and `getPrincipal`
- `issueApiKey`, `getApiKey`, `listApiKeys`, `verifyApiKey`, and `revokeApiKey`
- optional `rotateApiKey`

`IssuedApiKey.secret` is the only secret-bearing result and is returned once.
`ApiKeyRecord` intentionally has no secret, so inspection and listing cannot
accidentally disclose one. Store only a one-way digest in the module database.
