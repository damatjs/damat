[Damat Guide](../GUIDE.md) › CLI reference

# 18. CLI reference

## `damat` — dev & modules ([docs](../../packages/cli/damat/README.md))

| Command                             | Description                                                                                                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `damat create <name>`               | Scaffold a new app (offline embedded templates; writes `.env` with generated secrets, git-inits, runs `bun install`). `--pin <ver>` pins `@damatjs/*`, `--no-git` / `--no-install` skip steps                         |
| `damat clone <src> [dir]`           | git clone with extras: github shorthand + `#ref`, subdirectory extraction, `--fresh` (new history), `--name` (package rename), `--install`, `--depth`. Overlays the system git — clear error if git is missing        |
| `damat dev`                         | Start the dev server with hot reload                                                                                                                                                                                  |
| `damat build`                       | Type-check the whole app (`tsc --noEmit`), then bundle for production. Fails on any type error; `--no-typecheck` skips the check                                                                                      |
| `damat start`                       | Start the production server                                                                                                                                                                                           |
| `damat codegen <module>` \| `--all` | Types + zod + registry, and scaffold-once CRUD. Name a module, or pass `--all` for every module in the config                                                                                                         |
| `damat barrel [dir]`                | Recursively (re)write `index.ts` barrels so one bare import (`@workflows`) re-exports a whole tree (default `src/workflows`)                                                                                          |
| `damat module add <src>`            | Install from registry, local path, Git/GitHub, npm, or tarball through the transactional installer. Source mode is stable; package mode requires `--experimental-package`                                              |
| `damat module plan <src>`           | Preview capability mapping, operations, warnings, and integration instructions without mutation                                                                                                                       |
| `damat module remove <id>`          | Remove installer-owned files/packages, back up confirmed modified owned files, and report remaining usage. Shared integration files stay user-owned                                                                    |
| `damat module update <id>`          | Re-resolve the recorded origin and transactionally update installer-owned content                                                                                                                                      |
| `damat module list`                 | List installed modules                                                                                                                                                                                                |
| `damat module init <name>`          | Scaffold a standalone module package                                                                                                                                                                                  |
| `damat module dev`                  | Run a module package as a live app                                                                                                                                                                                    |
| `damat module migration:create`     | Diff models → migration (in a module)                                                                                                                                                                                 |
| `damat module migration:run`        | Apply this module's migrations to `DATABASE_URL` (scoped to the module)                                                                                                                                               |
| `damat module migration:status`     | Show this module's applied vs pending migrations                                                                                                                                                                      |
| `damat module codegen`              | Types + zod + registry, and scaffold-once CRUD (in a module)                                                                                                                                                          |
| `damat module validate`             | Contract + registry-readiness check                                                                                                                                                                                   |
| `damat module build`                | Release gate for a module: type-check (`tsc --noEmit`) + contract validate. `--no-typecheck` / `--no-validate` skip a step                                                                                            |
| `damat kit add <src>`               | Install any `damat.json` kit through the same source/package engine as modules                                                                                                                                          |
| `damat kit plan <src>`              | Preview kit capability mapping and operations                                                                                                                                                                           |
| `damat kit list`                    | List kit records in `damat.lock.json`                                                                                                                                                                                   |
| `damat kit update <id>`             | Update a kit from its recorded origin                                                                                                                                                                                   |
| `damat kit remove <id>`             | Remove installer-owned kit content with modified-file safeguards                                                                                                                                                        |
| `damat kit init [name]`             | Describe the current codebase as a shareable kit by writing `damat.json`                                                                                                                                                |
| `damat kit validate`                | Validate the universal kit profile                                                                                                                                                                                      |

## `damat-orm` — migrations & codegen ([docs](../../packages/orm/cli/README.md))

| Command                           | Description                  |
| --------------------------------- | ---------------------------- |
| `damat-orm migrate:up`            | Apply pending migrations     |
| `damat-orm migrate:status`        | Show applied vs pending      |
| `damat-orm migrate:create <name>` | Create a migration           |
| `damat-orm migrate:list`          | List modules with migrations |

> Type generation moved out of `damat-orm` — use `damat codegen <module>` (in an app) or `damat module codegen` (in a module package). `damat-orm` is migrations-only.

## Scaffolding ([docs](../../packages/cli/damat/README.md))

Scaffolding lives in the `damat` CLI — `damat create` for apps and
`damat module init` for standalone modules:

```bash
bunx @damatjs/damat-cli@latest create my-app        # new project (writes .env, git-inits, installs deps)
bunx @damatjs/damat-cli@latest module init my-mod   # new standalone module (offline local scaffold)
```

---

Prev: [← Composing & linking modules](./17-composing-and-linking-modules.md) · [Guide home](../GUIDE.md) · Next: [Deployment →](./19-deployment.md)
