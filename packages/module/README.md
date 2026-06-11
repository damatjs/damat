# @damatjs/module

The damat module system in one package: the authoring surface, the portable
manifest contract, a standalone dev/test harness, and registry tooling.

A damat module is a self-contained vertical slice (models + migrations +
service + config + workflows). This package is what lets you **develop and
test a module on its own** — no backend app — and ship it so any damat app
can install it with `damat module add` (and, later, straight from the module
registry).

## Authoring

One import for everything a module author needs:

```ts
import { defineModule, ModuleService } from "@damatjs/module";

export class UserModuleService extends ModuleService({ models, credentialsSchema }) {}

export default defineModule("user", {
  service: UserModuleService,
  credentials: load,
});
```

## Standalone run & test (the harness)

`bootModule` wires the same infrastructure the framework uses in production
(ConnectionManager + PoolManager), applies the module's own migrations, and
initializes the module — so the module runs by itself:

```ts
import { bootModule, withModule } from "@damatjs/module";
import userModule from "./index";

// playground / scripts
const booted = await bootModule(userModule, { moduleDir: import.meta.dir });
const user = await booted.service.user.create({ data: { email: "a@b.co" } });
await booted.teardown();

// tests — boot, run, always tear down
await withModule(userModule, { moduleDir: import.meta.dir }, async ({ service }) => {
  expect(await service.user.exists({ where: { email: "a@b.co" } })).toBe(true);
});
```

Requires a Postgres database (`DATABASE_URL` or `{ databaseUrl }`).
In test suites, gate DB tests with `describe.skipIf(!process.env.DATABASE_URL)`.

## Manifest contract

Every portable module ships a `module.json` ([full reference](../../MODULES.md)):

```ts
import { readModuleManifest, validateModuleManifest } from "@damatjs/module";
```

## Registry readiness

The hosted module registry isn't live yet, but the contract is fixed now so
modules can be authored registry-ready:

```ts
import { validateModuleDir, parseModuleRef } from "@damatjs/module";

const report = validateModuleDir("./src/modules/user");
// report.errors   → blocks install (missing entry, broken manifest, ...)
// report.warnings → blocks publishing (missing version, license, namespace, ...)

parseModuleRef("damatjs/user@0.2.0");
// → { namespace: "damatjs", name: "user", version: "0.2.0" }
```

`damat module add user@0.2.0` already recognizes registry references and will
resolve them against the registry once it ships; until then it accepts local
paths and git sources.
