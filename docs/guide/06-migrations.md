[Damat Guide](../GUIDE.md) › Migrations

# 6. Migrations

Damat's migration system ([`@damatjs/orm-migration`](../../packages/orm/migration/README.md))
is **module-aware**: each module owns a `migrations/` folder, and applied
migrations are tracked **per module** so modules can be added and migrated
independently. Migrations aren't hand-written — generation diffs your current
models against a stored snapshot and emits SQL via
[`@damatjs/orm-processor`](../../packages/orm/processor/README.md).

Which CLI drives it depends on where you are: `damat-orm` inside an assembled app,
`damat module` inside a standalone module package. Both target the same per-module
system.

## In an app (`damat-orm`)

```bash
bun run db:create add_users        # generate a migration from model changes
bun run db:migrate                 # apply all pending migrations
bun run db:status                  # what's applied vs pending
```

Those scripts map to the [`damat-orm`](../../packages/orm/cli/README.md) commands
`migrate:create`, `migrate:up`, `migrate:status`, and `migrate:list`.

> Applied migrations are recorded in a tracking table so re-running `migrate:up`
> is safe and idempotent.

## In a standalone module (`damat module`)

When authoring a module on its own, drive the same per-module system through
`damat module` — no `damat.config.ts` required, scoped to just this module's
models and `migrations/` folder:

```bash
damat module migration:create   # diff this module's models -> a SQL migration
damat module migration:run       # apply this module's migrations to DATABASE_URL
damat module migration:status    # show this module's applied vs pending migrations
```

`migration:run` and `migration:status` read `DATABASE_URL` from the module's
`.env`, connect, and operate only on this module — migrations stay tracked under
the module's name, so `migration:run` is idempotent too. See
[Authoring a module](./13-authoring-modules.md).

---

Prev: [← Defining models](./05-models.md) · [Guide home](../GUIDE.md) · Next: [Modules & services →](./07-modules-and-services.md)
