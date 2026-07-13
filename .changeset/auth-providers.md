---
"@damatjs/auth": minor
"@damatjs/auth-better-auth": minor
"@damatjs/auth-clerk": minor
"@damatjs/auth-auth0": minor
"@damatjs/framework": minor
"@damatjs/damat-cli": minor
---

Authentication out of the box via pluggable providers — Better Auth, Clerk, Auth0, or your own:

- **@damatjs/auth** (new): the provider-agnostic contract — `AuthProvider` (`authenticate → principal`, optional `authenticateApiKey`/`routes`/`shutdown`), `AuthPrincipal` (structurally the framework's `AuthUser`; `orgId` → team), `createAuthHandlers` (turns a provider into the framework's session/apiKey/flexible middleware), and `defineAuthProvider`/`defineAuthAdapter` helpers for **building your own** provider. Verification errors are treated as 401 (never 500); the opt-in `onAuthenticated` hook fires once per verified request. Depends only on `@damatjs/logger`.
- **@damatjs/auth-better-auth / -clerk / -auth0** (new): dedicated adapters. Better Auth runs in-backend (mounts `/api/auth/*`, verifies sessions, reads the tables it's told about — it creates none); Clerk (`@clerk/backend`) and Auth0 (`jose` JWKS) are hosted and verify-only. Vendor SDKs are peer dependencies — install only the adapter you use.
- **@damatjs/framework**: new `services.auth` config (`{ provider, options?, onAuthenticated? }`). The framework **dynamically imports** the named adapter only when configured — apps without auth pull in nothing; a provider set but not installed fails boot with a clear `bun add …` message. It builds the provider (injecting the app's pool for persisting providers), feeds handlers into the existing router auth system so `auth: "session"` routes light up, mounts provider routes before the file router, populates `c.get("user")`/`c.get("team")`, and registers a shutdown handler. A `provider` value containing `/` loads a custom package verbatim — so your own `@org/auth-x` adapter wires in identically.
- **@damatjs/damat-cli**: new `damat auth` command group. `damat auth init <provider>` scaffolds the Better Auth storage module (Damat-native models + service you own, registered in `damat.config.ts`, applied via the normal `damat-orm migrate:up`) — the auth packages never create or migrate schema. For hosted providers it prints that no local tables are needed.
