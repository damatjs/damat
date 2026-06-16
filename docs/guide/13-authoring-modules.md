[Damat Guide](../GUIDE.md) › Authoring a module

# 13. Authoring a module

A module can be developed and shipped as a **standalone package**, with no
backend app around it. This is what [`@damatjs/module`](../../packages/module/README.md)
enables, and it's how shareable modules are built. (For the why, see
[Concepts → The module lifecycle](./02-concepts.md#the-module-lifecycle).)

## Scaffold and develop

```bash
damat module init my-module      # scaffold a standalone module package
cd my-module
damat module dev                 # run the module as a live app (its own server)
```

Inside the package you write the same `index.ts` / `service.ts` / `models/`
you would in an app. For modules, import the authoring surface from
`@damatjs/module` (a single import for `defineModule`, `ModuleService`,
`model`/`columns`, the workflow engine, route types, and zod):

```ts
import { defineModule, ModuleService, model, columns } from "@damatjs/module";
```

## Test it in isolation

The harness boots the same infrastructure the framework uses (connection
manager + pool), applies the module's own migrations, and initializes it — so
you can test the service without a server:

```ts
import { withModule } from "@damatjs/module";
import userModule from "./index";

await withModule(userModule, { moduleDir: import.meta.dir }, async ({ service }) => {
  await service.user.create({ data: { email: "a@b.co" } });
  expect(await service.user.exists({ where: { email: "a@b.co" } })).toBe(true);
});
```

## Tooling

```bash
damat module migration:create    # diff models -> a migration
damat module codegen             # generate row types + zod schemas
damat module validate            # contract + registry-readiness check
```

## Make it portable: `module.json`

Ship a `module.json` next to `index.ts`. It declares the module's name, version,
required env vars, npm packages, dependencies on other modules, and registry
metadata. This is the contract `damat module add` reads. **Full reference:**
[MODULES.md](../../MODULES.md).

```jsonc
{
  "name": "user",
  "version": "0.1.0",
  "description": "Auth, sessions and accounts.",
  "env": [{ "name": "BETTER_AUTH_SECRET", "required": true, "example": "min-32-chars…" }],
  "packages": { "better-auth": "^1.4.18" },
  "registry": { "namespace": "damatjs", "keywords": ["auth"], "license": "MIT" }
}
```

Run `damat module validate` until it reports no warnings — then it's
registry-ready. See [`@damatjs/module` internals](../../packages/module/docs/README.md)
for the authoring, harness, runtime, tooling, and registry details.

---

Prev: [← The default backend](./12-default-backend.md) · [Guide home](../GUIDE.md) · Next: [Installing existing modules →](./14-installing-modules.md)
