[Damat Guide](../GUIDE.md) › CLI reference

# 18. CLI reference

## `damat` — dev & modules ([docs](../../packages/cli/damat/README.md))

| Command | Description |
|---------|-------------|
| `damat dev` | Start the dev server with hot reload |
| `damat build` | Build for production |
| `damat start` | Start the production server |
| `damat codegen [module]` | Types + zod + registry, and scaffold-once CRUD (app module) |
| `damat module add <src>` | Install a module (registry/path/git) |
| `damat module list` | List installed modules |
| `damat module init <name>` | Scaffold a standalone module package |
| `damat module dev` | Run a module package as a live app |
| `damat module migration:create` | Diff models → migration (in a module) |
| `damat module codegen` | Types + zod + registry, and scaffold-once CRUD (in a module) |
| `damat module validate` | Contract + registry-readiness check |

## `damat-orm` — migrations & codegen ([docs](../../packages/orm/cli/README.md))

| Command | Description |
|---------|-------------|
| `damat-orm migrate:up` | Apply pending migrations |
| `damat-orm migrate:status` | Show applied vs pending |
| `damat-orm migrate:create <name>` | Create a migration |
| `damat-orm migrate:list` | List modules with migrations |
| `damat-orm generate:types <module>` | Generate row/type files from a module's models |

## `create-damat-app` — scaffolding ([docs](../../packages/cli/create-damat-app/README.md))

```bash
bunx create-damat-app@latest my-app           # new project (clones the starter)
bunx create-damat-app@latest my-mod --module  # new standalone module (scaffolds locally)
```

---

Prev: [← Composing & linking modules](./17-composing-and-linking-modules.md) · [Guide home](../GUIDE.md) · Next: [Deployment →](./19-deployment.md)
