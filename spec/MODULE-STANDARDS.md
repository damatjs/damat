# Module coding standards (read this before writing module code)

These are the **non-negotiable** code-shape rules for every Damat module in this
library. They exist because this code is **reused a lot** — standardized, small,
readable code is the whole point of the codegen-first structure. The generated
`AGENTS.md` in each module covers framework mechanics; this file is the house
style that sits on top of it. Future AI: follow this exactly.

## The one-way layering

```
API route  →  workflow  →  step  →  service  →  lib function
(http)        (saga,       (unit of   (lean: a       (the real
              owns the     work +     category-D     logic +
              revert)      revert)    1-line         integrations)
                                      delegate)
```

Plain single-table data work skips the service entirely: the step/route/gateway
calls the accessor `getModule("x").<table>` directly (see "The service is LEAN").

## Imports (portable aliases)

Module code uses two install-stable tsconfig aliases — `@<module>/*` for
stay-inside parts (types, config/schema, service, lib, models) and
`@workflows/<module>/<table>/…` for moved-out workflows (and the routes that
import them); same-directory sibling re-exports stay relative; NEVER use `@/`
(it resolves to the app root after install). Codegen emits these; hand-written
files must use the SAME specifiers codegen emits — never invent a new alias or
flatten a deep path to dodge it. The only cross-module specifier is codegen's
link augmentation (`<table>.links.ts`) importing `@<other>/types`, which you
never hand-write. Full rule: [`AUTHORING-GUIDE.md`](./AUTHORING-GUIDE.md) §2.

- **Workflows/steps exist for the revert.** A step has a forward + a compensation
  (reverse); a workflow chains steps and rolls them back on failure. That is the
  ONLY reason to use a workflow. **Workflows are used by `api/routes` — not by the
  service.** The service never orchestrates and never compensates.
- **Routes only call workflows.** Never the service, never business logic.
- **Only steps reach the service**, via the typed `getModule("<name>")`.

## The service is LEAN — category-D logic only

As of `@damatjs/services@0.3.1` the default per-table accessor
`getModule("x").<table>` (or `this.<table>` inside a service) is the **one** way to
do single-table data work. It covers the full surface:

`create / createMany / find / findOne / findById / findMany / update / updateOne /
upsert / upsertMany / delete / softDelete / restore / count / exists`

— with `delete` / `softDelete` taking `cascade: true`. The wrapper layer that older
modules put in front of it is now pure redundancy.

1. **Steps, route workflows, and gateway functions call the accessor directly.**
   Never write a service or gateway method that just re-exposes one accessor call
   with a fixed `where`/`orderBy`, a re-read, a one-column update, a single or
   cascade delete, or an upsert.
2. **Write a service method ONLY for category-D logic**, kept as a one-line delegate
   to a `lib/gateway` function:
   ```ts
   run(req: AiRunRequest) { return gateway.run(this, req); }
   ```
   Category-D is validation/branching pipelines, multi-table aggregates/roll-ups,
   money/posting/numbering/scheduling math, or third-party integrations. The real
   logic lives in `lib/`, takes the service as its first argument, and uses the
   accessor for persistence.
3. **A plain read with a fixed filter is not a method.** The step/route calls
   `findMany({ where, orderBy })` / `findById` / `findOne` itself.
4. **Validation-on-write** lives in the route's zod validator and/or a pure guard in
   `lib/utils` that a category-D pipeline calls — not a per-field wrapper. (The
   accessor also validates writes against the model schema.)
5. **No types inside the service file.** Request/response/filter/row types live in
   `src/types/*` (see below). The service imports them.
6. **No orchestration, no retries-as-saga, no compensation** in the service.

### Keep / drop table (apply this to every method)

| pattern | example | verdict |
|---|---|---|
| get/find by id, list by FK, add, set-one-column, single delete | `getX`,`listForY`,`addX`,`setStatus`,`deleteX` | **drop → accessor** (`findById` / `findMany` / `create` / `updateOne` / `delete`) |
| upsert | `upsertSequence`,`upsertCurrency` | **drop → `accessor.upsert({ data, onConflict, … })`** |
| cascade / multi-table delete | `deleteXCascade` | **drop → `accessor.delete({ where, cascade: true })`** |
| pipeline / aggregate / money-math / numbering / integration | `post`,`createX`,`getX`-aggregate,`trialBalance`,`run`,`seedDefaults` | **keep → 1-line `lib/gateway` delegate** |

A correct service file is the 2–5 category-D one-liners and fits well under 100 lines.
A category-D method that the accessor needs *internally* (an `upsert`-rewritten
sequence helper, a `recordEvent` primitive, an aggregate's child reader) stays a
`lib/gateway` function but is NOT re-exposed on the service surface.

**Return-type cautions when swapping:** `delete` returns a **count, not rows** — a
caller that needs the deleted row (e.g. for compensation) must read-before-delete.
`updateOne` / `findOne` / `findById` return one row (or `null`); `update` / `findMany`
return arrays. `upsert` returns the affected row. Cascade is recursive within one
transaction and honors each relation's `rule.onDelete`.

### Accessor API (0.3.1)

The exact arg shapes and return types of the ops that replace wrappers (verified
from `@damatjs/services@0.3.1`):

| accessor method | signature | returns |
|---|---|---|
| `upsert` | `{ data, onConflict: string[], updateColumns?, set?, returning? }` | `T` |
| `upsertMany` | `{ data: [], onConflict, updateColumns?, set?, returning? }` | `T[]` |
| `delete` | `{ where, returning?, cascade? }` | **`number`** |
| `softDelete` | `{ where, returning?, cascade? }` | `T[]` |
| `findById` | `(id, { select?, include?, … })` | `T \| null` |
| `findOne` | `(where, { … })` | `T \| null` |
| `updateOne` | `{ where, data, returning? }` | `T \| null` |

Cascade is recursive/depth-first inside one transaction and **honors each
relation's `rule.onDelete`** (CASCADE / SET NULL → recurse / null the child FK;
RESTRICT / NO ACTION → throw when children exist), with a cycle guard — matching
every hand-rolled cascade. (Return-type cautions above still apply — don't
re-derive them.)

When dropping a wrapper, apply this mechanical mapping:

```
getX(id) / get-by-pk          → findById(id)
getXBy(field)  (single)       → findOne({ field })
listX / listXBy(field)        → findMany({ where:{…}, orderBy:[…] })
addX(data)                    → create({ data })
setStatus(id,s) / 1-col patch → updateOne({ where:{id}, data:{…} })
updateX(id,patch) (wants row) → updateOne({ where:{id}, data:patch })
deleteX(id)                   → delete({ where:{id} })
upsertX(…)                    → upsert({ data, onConflict:[…], updateColumns?/set? })
deleteXCascade(id)            → delete({ where:{id}, cascade:true })   // soft: softDelete({…,cascade:true})
```

## Everything the service calls lives in `src/lib/`

Organize by concern, one folder per subsystem, each file one idea:

```
src/lib/
├── providers/     # third-party SDK adapters (one file each) + contract + registry
│   ├── types.ts errors.ts shared.ts        # contract, error class, shared helpers
│   ├── stub.ts anthropic.ts openai.ts …     # one adapter per file
│   └── registry.ts index.ts
├── pricing/       # types.ts (rates) · table.ts (data) · compute.ts (logic) · index.ts
├── utils/         # constants.ts + one pure helper per file (interpolate, crypto, json, backoff)
└── gateway/       # the table's category-D operations the service delegates to
    ├── run.ts call.ts resolve.ts row.ts map.ts   # the run() pipeline, split by step
    ├── sessions.ts prompts.ts stats.ts            # other non-CRUD ops
    └── index.ts                                    # barrel the service imports
```

`lib/gateway` functions take `service: <Name>Service` (a type-only import — no
runtime cycle) and call `service.<table>.*` for persistence.

## Types live in `src/types/` — never inline

- **Generated** (don't edit): `<table>.ts`, `<table>.zod.ts`, `index.ts`,
  `registry.ts`. These are the row types — *what exists*.
- **Hand-added** (codegen-safe — verified: codegen preserves extra files in
  `types/`): your request/response/filter/stats types and any narrowed row
  records — *what you add*. Import the generated barrel from `./types` and your
  own from `./types/<name>`.

## No file over 100 lines — dissect by concern

Hard rule for hand-written files. If a file (or a function) grows past it, split
it into smaller single-purpose functions in separate files. Readability is the
priority. (Generated files — e.g. `*.zod.ts` — are codegen output and exempt.)

Tactics that keep files small:
- One provider/integration per `lib/<area>/<name>.ts`; shared glue in `shared.ts`.
- A long pipeline (like `run`) splits into `resolve` → `call` → `row` → `map`
  steps, orchestrated by a thin top function.
- A big table (`PRICES`) is its own data file, separate from the function that
  reads it.

## Checklist before you commit a module

- [ ] Service holds ONLY category-D methods; no method body is a single accessor call (no `getX`/`listX`/`addX`/`setStatus`/`deleteX`/`upsertX`/`deleteXCascade` wrappers).
- [ ] No hand-rolled `upsert` (find→update/create→re-read) and no hand-rolled `*Cascade` remain (`grep -rn 'Cascade' src` is clean).
- [ ] Steps, tests, and playground call the accessor for plain reads/writes/deletes; only category-D ops go through the service.
- [ ] Every `delete` whose return value is used reads-before-delete (`delete` returns a count, not rows).
- [ ] `providers`, `pricing`, `utils`, and the category-D ops are all under `src/lib/`.
- [ ] Request/response/row types are in `src/types/*`; removed methods' now-dead `*Filter`/`*Search` types are dropped from `types/*` and the `index.ts` re-exports.
- [ ] No hand-written `.ts` file exceeds 100 lines (`find src -name '*.ts' | xargs wc -l`).
- [ ] Workflows/steps are only consumed by `api/routes`; the service has no compensation.
- [ ] `@damatjs/*` resolve to `>= 0.3.1`.
- [ ] `bun run typecheck && bun run validate && bun test && bun run playground` all pass.

## The `module.json` contract

`module.json` ships next to the module's `index.ts` (in `src/`) and is what makes
a module portable. The types live in `@damatjs/module` (`src/manifest/types.ts`).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Module id; registry key and default install directory (kebab-case). |
| `version` | string | — | Semver. Required to publish to a registry. |
| `description` | string | — | Shown on install and in the registry. |
| `author` | string \| object | — | `"Name <email> (url)"` or `{ name, email?, url? }`. Mirrored by the registry; **not** the verified owner. |
| `env` | `ModuleEnvVar[]` | — | Each `{ name, required?, description?, example? }`. Drives `.env.example` sync. |
| `packages` | `Record<string,string>` | — | npm deps installed into the host app on `add`. |
| `modules` | `string[]` | — | Other module ids this module needs (a warning if missing). |
| `paths` | object | — | Overrides for `entry`/`models`/`migrations`/`workflows`/`types`. |
| `registry` | object | — | `namespace`, `keywords`, `license`, `repository`, `homepage`. |

**Standard layout** (when `paths` is omitted): `entry ./index.ts`,
`models ./models`, `migrations ./migrations`, `workflows ./workflows`,
`types ./types`.

`bun run validate` (i.e. `damat module validate`) runs two checks: **errors**
block installing (missing entry, broken manifest, …) and **warnings** block
publishing (missing version, license, namespace, …). Author every module
*registry-ready* (no warnings) even before a hosted registry exists. Programmatic
equivalent:

```ts
import { validateModuleDir } from "@damatjs/module";
const report = validateModuleDir("./src");
// report.errors / report.warnings
```

## Registry & verification (distribution)

A registry is an index that maps a module ref to a fetchable **source** plus the
trust metadata that makes an install trustworthy. Point `DAMAT_MODULE_REGISTRY`
at an index URL or file (the public registry, or a company-internal one):

```json
{
  "modules": {
    "damatjs/user-management": {
      "source": "https://github.com/damatjs/modules.git#main",
      "description": "Workspaces, teams, memberships, API keys",
      "author": { "name": "damatjs", "url": "https://github.com/damatjs" },
      "owner": { "namespace": "damatjs", "id": "org_damatjs", "verified": true },
      "verification": {
        "status": "verified",
        "verifiedBy": "registry.damatjs.dev",
        "verifiedAt": "2026-06-13T00:00:00Z"
      },
      "keywords": ["teams", "api-keys"],
      "license": "MIT",
      "latest": "0.0.1",
      "versions": { "0.0.1": { "source": "...", "integrity": "sha256-…" } }
    }
  }
}
```

**Who controls what** — two planes (the npm package.json / registry-metadata split):

- The **author** declares `name / version / author / license / keywords /
  repository / homepage` in their `module.json`; the registry mirrors them for
  search and display.
- The **registry backend** assigns `owner` — the verifiable account that
  published the module, the trust anchor — and stamps `verification`
  (`unverified | pending | verified | rejected | revoked`). An author **cannot
  self-verify**. *(The hosted backend that performs identity/source verification
  is not live yet; until then an entry carries whatever status its index author
  set, and the gate below applies the policy.)*

Refs follow `namespace/name@version` (`parseModuleRef` / `formatModuleRef`). On a
registry install, `damat module add` evaluates the entry's verification against a
policy (`DAMAT_MODULE_VERIFY`, or the boolean shortcut
`DAMAT_MODULE_REQUIRE_VERIFIED=true` ⇒ `require`):

| policy | unverified / pending | rejected / revoked | verified |
| --- | --- | --- | --- |
| `off` | install | **block** | install |
| `warn` *(default)* | install + warn | **block** | install |
| `require` | **block** | **block** | install |

Path and git sources skip the gate — you pointed at them directly.

See [`AUTHORING-GUIDE.md`](./AUTHORING-GUIDE.md) for the from-scratch authoring
loop and the portable-alias rule. For an in-repo worked reference of the current
shape, see `modules/module-sample/`. The sibling-repo modules `medical/referral`
(lean-service exemplar) and `ai/layer` (providers/pricing subsystem) are
illustrative but have NOT been regenerated onto the current alias/nesting scheme —
read them for service/lib/types shape only.
