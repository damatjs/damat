---
"@damatjs/damat-cli": minor
---

Offline app scaffolding — `damat create` replaces the starter-repo clone:

- New top-level `damat create <name>` (alias `new`) scaffolds a complete backend app from embedded templates, exactly like `module init` does for modules — no starter repository, works offline. It writes `damat.config.ts` (empty `modules` block ready for `module add`), a standalone tsconfig with the `@workflows` aliases, an example `/api/hello` route, `.env.example` plus a `.env` with generated `JWT_SECRET`/`COOKIE_SECRET` (Redis commented out so a password-protected localhost instance can't fail the first boot), then git-inits and runs `bun install` (`--no-git` / `--no-install` to skip; failures warn instead of aborting). `@damatjs/*` dependencies default to the CLI's own version (`--pin` to override), so one pin governs the whole generation.
- The `@damatjs/create-damat-app` wrapper package is retired: it has been removed from the repository and deprecated on npm. The getting-started command is now `bunx @damatjs/damat-cli@latest create my-app`.
