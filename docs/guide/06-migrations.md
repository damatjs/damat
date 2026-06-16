[Damat Guide](../GUIDE.md) › Migrations

# 6. Migrations

Damat's migration system ([`@damatjs/orm-migration`](../../packages/orm/migration/README.md))
is **module-aware**: each module owns a `migrations/` folder, and applied
migrations are tracked **per module** so modules can be added and migrated
independently. The `damat-orm` CLI drives it.

```bash
bun run db:create add_users        # generate a migration from model changes
bun run db:migrate                 # apply all pending migrations
bun run db:status                  # what's applied vs pending
```

Those scripts map to the [`damat-orm`](../../packages/orm/cli/README.md) commands
(`migrate:create`, `migrate:up`, `migrate:status`, `migrate:list`). Generation
diffs your current models against a snapshot and
emits SQL via [`@damatjs/orm-processor`](../../packages/orm/processor/README.md).

> Applied migrations are recorded in a tracking table so re-running `migrate:up`
> is safe and idempotent.

When authoring a standalone module, use `damat module migration:create` instead
— see [Authoring a module](./13-authoring-modules.md).

---

Prev: [← Defining models](./05-models.md) · [Guide home](../GUIDE.md) · Next: [Modules & services →](./07-modules-and-services.md)
