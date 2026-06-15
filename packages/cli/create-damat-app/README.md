# @damatjs/create-damat-app

> `create-damat-app` — scaffold a new Damat backend or module with a single command.

`@damatjs/create-damat-app` provides the `create-damat-app` binary. It clones the
appropriate starter repository, renames and re-versions the project, writes
default environment variables, installs dependencies with Bun, and (for a full
project) starts the dev server. It supports two modes — a full **project** and a
standalone **module** — and runs an interactive, animated terminal experience
(spinner, tips box, prompts) built on the shared `@damatjs/cli` runner.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

The binary is `create-damat-app`. You normally run it via your runner without
installing it globally.

```bash
# scaffold in one shot
bunx @damatjs/create-damat-app@latest my-app
npx  create-damat-app@latest my-app

# or install globally
bun add -g @damatjs/create-damat-app
create-damat-app my-app
```

> Bun is required (>= major v1). The CLI checks the running Bun version up front
> and exits with an install link if it is too old.

## Commands

One command, `create` (aliases `init`, `new`); the project name is the first
positional argument.

| Command | Description | Example |
|---|---|---|
| `create [name]` | Scaffold a project (or module with `--module`) | `create-damat-app my-app` |

### Options

| Option | Alias | Type | Default | Description |
|---|---|---|---|---|
| `--module` | | boolean | `false` | Create a module instead of a project |
| `--repo-url <url>` | `-r` | string | starter default | Clone from a custom repository |
| `--version <version>` | `-v` | string | `latest` | Version to pin `@damatjs/*` deps to |
| `--directory-path <path>` | `-d` | string | `process.cwd()` | Directory to create the project in |
| `--verbose` | | boolean | `false` | Stream all command output (debugging) |

Default starter repos (from `src/utils/actions/cloneRepo.ts`):

- project → `https://github.com/damatjs/damat-starter-default`
- module → `https://github.com/damatjs/damat-starter-module`

## When to use

- **Starting a new Damat backend**: `create-damat-app my-app` clones the default
  starter, prepares it, installs deps, and launches `bun run dev`.
- **Starting a new standalone module**: `create-damat-app my-module --module`
  clones the module starter and prepares it (no dev server is started).
- **From a custom template**: pass `--repo-url` to scaffold from your own fork.
- For composing modules into an *existing* app, use `damat module add`
  (`@damatjs/damat-cli`) instead — this CLI is only for initial scaffolding.

## Quick start

```bash
# full project (clones, prepares, installs, starts dev)
bunx @damatjs/create-damat-app@latest my-app

# module package (clones + prepares; no server)
bunx @damatjs/create-damat-app@latest my-module --module

# pin damat package versions and choose a directory
bunx @damatjs/create-damat-app@latest my-app -v 0.0.10 -d ./projects

# scaffold from a custom starter, with full logs
bunx @damatjs/create-damat-app@latest my-app -r https://github.com/me/my-starter --verbose
```

What a **project** run does (grounded in `damatProjectCreator`):

1. Clone the starter (`--depth 1`), strip its `.git`/`.github`, and `git init` a
   fresh `main` with a bootstrap commit.
2. Update `package.json` (name, `packageManager: bun@<ver>`, and pin
   `@damatjs/*` deps to `--version`).
3. Append default env vars to `.env` (`FRONTEND_CORS`, `AUTH_CORS`,
   `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`).
4. `bun install` (removing stray non-Bun lockfiles first).
5. Start `bun run dev`; on terminate, print a success box.

A **module** run does steps 1, 2, 4 only (no `.env`, no version pinning, no dev
server) and prints its success box immediately.

If you pass a name that already exists, contains a dot, or is omitted, the CLI
prompts interactively (and slugifies the answer).

## How it fits

**Depends on**:

- `@damatjs/cli` — command runner, option parsing, banner.
- `@damatjs/deps` — bundled `pg` client (used by the standalone database helpers).
- `@clack/prompts` — interactive prompts. `yocto-spinner` — spinner.
- `boxen`, `picocolors`, `node-emoji`, `terminal-link` — terminal styling.
- `slugify`, `configstore`, `winston`, `wait-on`, `open` — naming, persisted
  config, logging, readiness waiting, browser opening.

**Consumed by**: developers bootstrapping a new project. The generated project
then uses the `damat` CLI (`@damatjs/damat-cli`) for its lifecycle.

## Documentation

- [Internals](./docs/README.md) — module map and the create flow, project-vs-
  module differences, database setup, and package-manager handling.
- [Full guide](../../../docs/GUIDE.md) — the Damat monorepo guide.

## License

MIT
