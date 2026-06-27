[Damat Guide](../GUIDE.md) › CLI reference

# 18. CLI reference

## `damat` — dev & modules ([docs](../../packages/cli/damat/README.md))

| Command | Description |
|---------|-------------|
| `damat dev` | Start the dev server with hot reload |
| `damat build` | Type-check the whole app (`tsc --noEmit`), then bundle for production. Fails on any type error; `--no-typecheck` skips the check |
| `damat start` | Start the production server |
| `damat codegen <module>` \| `--all` | Types + zod + registry, and scaffold-once CRUD. Name a module, or pass `--all` for every module in the config |
| `damat barrel [dir]` | Recursively (re)write `index.ts` barrels so one bare import (`@workflows`) re-exports a whole tree (default `src/workflows`) |
| `damat module add <src>` | Install a module (registry/path/git); splits routes/workflows/tests under `<moduleId>`, and splits any shipped link files into `src/links/<moduleId>/` (ensuring `links:` in `damat.config.ts`) |
| `damat module list` | List installed modules |
| `damat module init <name>` | Scaffold a standalone module package |
| `damat module dev` | Run a module package as a live app |
| `damat module migration:create` | Diff models → migration (in a module) |
| `damat module migration:run` | Apply this module's migrations to `DATABASE_URL` (scoped to the module) |
| `damat module migration:status` | Show this module's applied vs pending migrations |
| `damat module codegen` | Types + zod + registry, and scaffold-once CRUD (in a module) |
| `damat module validate` | Contract + registry-readiness check |
| `damat module build` | Release gate for a module: type-check (`tsc --noEmit`) + contract validate. `--no-typecheck` / `--no-validate` skip a step |

## `damat-orm` — migrations & codegen ([docs](../../packages/orm/cli/README.md))

| Command | Description |
|---------|-------------|
| `damat-orm migrate:up` | Apply pending migrations |
| `damat-orm migrate:status` | Show applied vs pending |
| `damat-orm migrate:create <name>` | Create a migration |
| `damat-orm migrate:list` | List modules with migrations |

> Type generation moved out of `damat-orm` — use `damat codegen <module>` (in an app) or `damat module codegen` (in a module package). `damat-orm` is migrations-only.

## `create-damat-app` — scaffolding ([docs](../../packages/cli/create-damat-app/README.md))

```bash
bunx create-damat-app@latest my-app           # new project (clones the starter)
bunx create-damat-app@latest my-mod --module  # new standalone module (scaffolds locally)
```

---

Prev: [← Composing & linking modules](./17-composing-and-linking-modules.md) · [Guide home](../GUIDE.md) · Next: [Deployment →](./19-deployment.md)
