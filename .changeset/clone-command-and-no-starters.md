---
"@damatjs/damat-cli": minor
"@damatjs/cli": patch
---

`damat clone`, starter repositories fully retired, and a CLI option-parsing fix:

- **@damatjs/damat-cli**: new top-level `damat clone <source> [dir]` — a thin overlay over the **system git** (it never bundles or downloads a replacement; when git is not on PATH it fails with one clear "git is required…" error, no fallback). Accepts full URLs and github shorthand (`user/repo`), each with an optional `#ref` (`--branch` overrides); can extract a repository **subdirectory** (`user/repo/sub/dir`) as the project, which git clone can't; `--fresh` strips `.git`/`.github` and starts a new `main` history with a bootstrap commit; `--name` rewrites `package.json`'s name; `--install` runs `bun install`; `--depth` for shallow clones. A plain `damat clone <url>` behaves exactly like git clone (full history, original `.git` kept). Git argv always passes `--` before the URL, and a failed clone removes the half-written target. The same clear git-missing error now guards `module add` git sources, and `damat create` says precisely when git is absent (init skipped, scaffold still succeeds). Also: `damat create`'s version option is now `--pin` (`--version` is cac's global CLI-version flag and can never carry a value).
- The `damat-starter-default`/`damat-starter-module` repositories are archived and no longer referenced anywhere; the `@damatjs/create-damat-app` wrapper package has been removed from the repository and deprecated on npm — scaffolding is `bunx @damatjs/damat-cli@latest create my-app` (apps) and `… module init <name>` (modules).
- **@damatjs/cli**: fixed option registration — non-boolean options were registered with cac as bare flags, so every top-level string/number option (`dev --port`, `build --output`, `create --pin`, …) parsed as `true` and coerced to garbage. They now declare a `<value>` placeholder so cac consumes the value token.
