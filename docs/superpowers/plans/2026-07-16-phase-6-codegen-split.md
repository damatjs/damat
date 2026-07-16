# Phase 6 Codegen Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move schema rendering and Damat module generation into separate owner
packages, migrate every internal consumer, and leave `@damatjs/codegen` as a
silent deprecated compatibility facade.

**Architecture:** `@damatjs/schema-codegen` is a pure `ModuleSchema`-to-source
library. `@damatjs/module-generator` owns discovery, filesystem output, Damat
registries, CRUD scaffolds, and barrels. `@damatjs/cli-codegen` and all other
internal packages import those owners directly; the legacy package only
re-exports them for external compatibility.

**Tech Stack:** TypeScript 5.9, ESM, Bun 1.3, Bun test, Turborepo, oxlint,
Prettier, Damat ORM schema types.

## Global Constraints

- `@damatjs/codegen` contains no generation implementation.
- No internal runtime, test, or script imports `@damatjs/codegen` after Task 4.
- Deprecation emits no runtime warning or import side effect.
- Generated schema, registry, workflow, step, route, and barrel output stays
  byte-for-byte equivalent unless a separately documented defect is found.
- Generated type and registry files may be replaced; scaffold-once files must
  never be overwritten.
- `@damatjs/schema-codegen` has no filesystem, framework, CLI, model-discovery,
  or required logger dependency.
- Every code, test, fixture, script, and generated file is at most 100 physical
  lines.
- Use Bun commands only; add no heavy dependencies.
- Complete and report each task before starting the next task.

---

## File Structure

### New pure package: `packages/core/schema-codegen`

```text
src/
├── index.ts                         # public pure API
├── defaults.ts                      # generated-field defaults
├── logger.ts                        # structural logger + no-op resolver
├── generator/
│   ├── generateFilesMap.ts          # deterministic file map
│   ├── generateTableFile.ts         # one row/type file
│   ├── generateTypes.ts             # combined TS output
│   ├── generateZodFile.ts           # one Zod file
│   ├── generateZodTypes.ts          # combined Zod output
│   └── helpers.ts                   # filename and relation imports
├── relation/                        # relation grouping and fields
├── type-mapping/
│   ├── ts/                          # PostgreSQL-to-TS mapping groups
│   └── zod/                         # PostgreSQL-to-Zod mapping groups
├── types/                           # generation option/result types
├── render/
│   ├── enums.ts                     # enum source rendering
│   ├── newType.ts                   # New* source rendering
│   ├── rowInterface.ts              # row interface rendering
│   ├── updateType.ts                # Update* source rendering
│   └── zod/                         # new/update/query/id renderers
└── tests/                           # pure tests split below 100 lines
```

### New Damat package: `packages/module-generator`

```text
src/
├── index.ts                         # public Damat generation API
├── barrel/                          # recursive deterministic barrels
├── registry/                        # app/module registry augmentation
├── run/                             # discovery and orchestration
├── scaffold/
│   ├── generateCrudScaffold.ts      # table loop only
│   ├── generateTableScaffold.ts     # one table's files
│   ├── importPaths.ts               # relative/alias import resolution
│   ├── writeOnce.ts                 # scaffold preservation primitive
│   ├── naming/                      # CRUD names
│   └── templates/                   # existing focused templates
└── tests/                           # I/O and orchestration tests
```

### Deprecated package: `packages/core/codegen`

```text
src/
├── index.ts                         # deprecated root re-exports only
├── types/index.ts                   # legacy type subpath re-exports
└── tests/compatibility.test.ts      # facade identity/export tests
```

---

### Task 1: Extract the Pure Schema Codegen Package

**Files:**

- Create: `packages/core/schema-codegen/package.json`
- Create: `packages/core/schema-codegen/tsconfig.json`
- Create: `packages/core/schema-codegen/LICENSE`
- Create: `packages/core/schema-codegen/bunfig.toml`
- Create: `packages/core/schema-codegen/README.md`
- Create: `packages/core/schema-codegen/docs/README.md`
- Create: `packages/core/schema-codegen/src/index.ts`
- Create: `packages/core/schema-codegen/src/logger.ts`
- Move and split: pure files under `packages/core/codegen/src/`
- Move and split: pure tests under `packages/core/codegen/src/tests/`
- Modify: `packages/core/codegen/package.json`
- Modify: `packages/core/codegen/src/index.ts`
- Modify: `packages/core/codegen/src/run/runModuleCodegen.ts`

**Interfaces:**

- Produces:
  `GenerationLogger = Pick<{debug; info}, "debug" | "info">`
- Produces:
  `generateFilesMap(schema, options?, logger?): Map<string, string>`
- Produces: the existing pure root exports from `@damatjs/schema-codegen`
- Consumes: `ModuleSchema`, `ColumnSchema`, and related types from
  `@damatjs/orm-type`

- [ ] **Step 1: Add a failing package-boundary test**

Create `packages/core/schema-codegen/src/tests/dependency-boundary.test.ts`:

```ts
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("schema codegen has only pure runtime dependencies", () => {
  const pkg = JSON.parse(
    readFileSync(join(import.meta.dir, "../../package.json"), "utf8"),
  );
  expect(pkg.dependencies).toEqual({
    "@damatjs/orm-type": "workspace:*",
  });
  const source = readFileSync(join(import.meta.dir, "../index.ts"), "utf8");
  expect(source).not.toContain("@damatjs/framework");
  expect(source).not.toContain("node:fs");
});
```

- [ ] **Step 2: Run the test and verify the package is missing**

Run:

```bash
bun test packages/core/schema-codegen/src/tests/dependency-boundary.test.ts
```

Expected: FAIL because `packages/core/schema-codegen` does not exist.

- [ ] **Step 3: Create package metadata**

Create `packages/core/schema-codegen/package.json` with:

```json
{
  "name": "@damatjs/schema-codegen",
  "description": "Pure TypeScript and Zod source generation from Damat module schemas",
  "version": "0.6.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "engines": { "bun": ">=1.1.0" },
  "publishConfig": { "access": "public" },
  "files": ["dist", "!dist/**/tests"],
  "license": "MIT",
  "dependencies": {
    "@damatjs/orm-type": "workspace:*"
  },
  "devDependencies": {
    "@damatjs/typescript-config": "workspace:*",
    "@types/bun": "1.3.9",
    "tsc-alias": "^1.8.16",
    "typescript": "^5.9.3"
  },
  "scripts": {
    "build": "rm -rf tsconfig.tsbuildinfo dist && tsc && tsc-alias",
    "test": "bun test ./src/tests",
    "lint": "oxlint src"
  }
}
```

Create `tsconfig.json` by copying the existing codegen config and retaining the
`@/* -> src/*` alias.

- [ ] **Step 4: Add the structural no-op logger**

Create `packages/core/schema-codegen/src/logger.ts`:

```ts
export interface GenerationLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
}

const noop = (): void => {};

export const NOOP_GENERATION_LOGGER: GenerationLogger = {
  debug: noop,
  info: noop,
};

export function generationLogger(logger?: GenerationLogger): GenerationLogger {
  return logger ?? NOOP_GENERATION_LOGGER;
}
```

Replace `@damatjs/logger` imports in pure generators with `generationLogger`.
Keep existing call signatures, adding an optional final structural logger only
where nested generation needs it.

- [ ] **Step 5: Move pure implementation and split long files**

Move `defaults`, `generator`, and `relation` into the new package. Move utility
renderers into `render/` and PostgreSQL mappings into `type-mapping/`.

Split `generateTypes.ts` so it exports only `generateTypes`; put
`generateZodTypes` in `generateZodTypes.ts`.

Split TypeScript mappings into focused `Map<ColumnType, string>` groups. The
scalar group is:

```ts
export const scalarTsTypes = new Map<ColumnType, string>([
  ["boolean", "boolean"],
  ["smallint", "number"],
  ["integer", "number"],
  ["smallserial", "number"],
  ["serial", "number"],
  ["bigint", "bigint"],
  ["bigserial", "bigint"],
  ["real", "number"],
  ["double precision", "number"],
  ["numeric", "number"],
  ["decimal", "number"],
  ["money", "string"],
  ["text", "string"],
  ["character varying", "string"],
  ["character", "string"],
  ["uuid", "string"],
]);
```

Use sibling maps for temporal, JSON/binary, network, geometric, range, search,
and PostgreSQL-specific types. `pgTypeToTsBase` performs ordered map lookup and
retains the existing enum fallback.

Split Zod renderers into:

- `render/zod/new.ts`
- `render/zod/update.ts`
- `render/zod/query.ts`
- `render/zod/identity.ts`
- `render/zod/helpers.ts`

Each file exports the existing function name and reproduces the existing source
string exactly.

- [ ] **Step 6: Move and split pure tests**

Move mapping, defaults, relation, generator, logger, and Zod tests into
`packages/core/schema-codegen/src/tests/`. Split cases into focused files named
by behavior, for example:

```text
tests/type-mapping/ts-scalars.test.ts
tests/type-mapping/ts-special.test.ts
tests/type-mapping/zod-scalars.test.ts
tests/type-mapping/zod-special.test.ts
tests/render/new-update.test.ts
tests/render/query-identity.test.ts
tests/generator/files-map.test.ts
tests/generator/table-file.test.ts
```

Every resulting test file must be at most 100 lines. Assertions and expected
strings move unchanged; do not weaken or delete coverage.

- [ ] **Step 7: Keep the old package working during the transition**

Add `@damatjs/schema-codegen` to `packages/core/codegen/package.json`.
Change the temporary root to:

```ts
export * from "@damatjs/schema-codegen";
export * from "./scaffold";
export * from "./run";
export * from "./barrel";
```

Change `runModuleCodegen.ts` to:

```ts
import { generateFilesMap } from "@damatjs/schema-codegen";
```

This makes Task 1 independently buildable before module generation moves.

- [ ] **Step 8: Run focused verification**

Run:

```bash
bun install
bun run --cwd packages/core/schema-codegen build
bun test packages/core/schema-codegen/src/tests
bun run --cwd packages/core/schema-codegen lint
bun run --cwd packages/core/codegen build
bun test packages/core/codegen/src/tests
bun scripts/check-code-lines.ts packages/core/schema-codegen
git diff --name-only 48fbbc1 -- '*.ts' | xargs bun scripts/check-code-lines.ts
```

Expected: all commands pass and every moved code/test file is at most 100 lines.

- [ ] **Step 9: Commit Task 1**

```bash
git add packages/core/schema-codegen packages/core/codegen bun.lock
git commit -m "feat: extract pure schema codegen package"
```

---

### Task 2: Extract the Damat Module Generator

**Files:**

- Create: `packages/module-generator/package.json`
- Create: `packages/module-generator/tsconfig.json`
- Create: `packages/module-generator/LICENSE`
- Create: `packages/module-generator/bunfig.toml`
- Create: `packages/module-generator/README.md`
- Create: `packages/module-generator/docs/README.md`
- Create: `packages/module-generator/src/index.ts`
- Move: `packages/core/codegen/src/barrel/`
- Move: `packages/core/codegen/src/run/`
- Move and split: `packages/core/codegen/src/scaffold/`
- Move and split: corresponding filesystem/orchestration tests
- Modify: `packages/core/codegen/package.json`
- Modify: `packages/core/codegen/src/index.ts`

**Interfaces:**

- Consumes: `generateFilesMap` and `GenerationLogger` from schema codegen
- Produces: `runCodegen`, `runModuleCodegen`, `RunModuleCodegenResult`
- Produces: `generateCrudScaffold`, `generateBarrels`, registry renderers

- [ ] **Step 1: Write failing scaffold-preservation tests**

Create `packages/module-generator/src/tests/scaffold/preservation.test.ts`:

```ts
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateCrudScaffold } from "../../scaffold";
import { oneTableSchema, scaffoldOptions } from "../support/scaffoldFixture";

test("regeneration preserves a user-edited scaffold file", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-"));
  const options = scaffoldOptions(root);
  const first = generateCrudScaffold(oneTableSchema, options);
  const edited = first.created.find((path) => path.endsWith("createUsers.ts"))!;
  writeFileSync(edited, "// user-owned\n", "utf8");
  const second = generateCrudScaffold(oneTableSchema, options);
  expect(readFileSync(edited, "utf8")).toBe("// user-owned\n");
  expect(second.skipped).toContain(edited);
});
```

Create the fixture helper below 100 lines with one `users` table and resolved
route/workflow/type directories.

- [ ] **Step 2: Run the test and verify the package is missing**

Run:

```bash
bun test packages/module-generator/src/tests/scaffold/preservation.test.ts
```

Expected: FAIL because `@damatjs/module-generator` does not exist.

- [ ] **Step 3: Create package metadata**

Create a package at version `0.6.0` with runtime dependencies:

```json
{
  "@damatjs/logger": "workspace:*",
  "@damatjs/orm-migration": "workspace:*",
  "@damatjs/orm-model": "workspace:*",
  "@damatjs/orm-type": "workspace:*",
  "@damatjs/schema-codegen": "workspace:*"
}
```

Use the same build/test/lint scripts as schema codegen.

- [ ] **Step 4: Move Damat-specific implementation**

Move `barrel`, `run`, `scaffold`, naming, registry, and templates into the new
package. Its root export is:

```ts
export * from "./barrel";
export * from "./registry";
export * from "./run";
export * from "./scaffold";
```

Change `run/runModuleCodegen.ts` to import:

```ts
import { generateFilesMap } from "@damatjs/schema-codegen";
```

- [ ] **Step 5: Split scaffold orchestration below 100 lines**

Create `scaffold/writeOnce.ts`:

```ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CrudScaffoldResult } from "./type";

export function writeOnce(result: CrudScaffoldResult) {
  return (path: string, content: string): void => {
    if (existsSync(path)) {
      result.skipped.push(path);
      return;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
    result.created.push(path);
  };
}
```

Create `scaffold/importPaths.ts` to produce this interface:

```ts
export interface ScaffoldImports {
  typesFromStep: string;
  typesFromWorkflow: string;
  stepsFromWorkflow: string;
  workflowFromRoute: string;
  typesFromRoute: string;
  workflowFromRouteId: string;
  typesFromRouteId: string;
}
```

Create `generateTableScaffold.ts` to write the existing five steps, five
workflows, five collection-route files, and four id-route files for one table.
`generateCrudScaffold.ts` becomes only the schema table loop plus completion
logging.

- [ ] **Step 6: Move and split module-generator tests**

Move barrel, registry, aliases, step reversion, and run tests. Split the current
long tests into:

```text
tests/barrel/layout.test.ts
tests/barrel/determinism.test.ts
tests/registry/app-registry.test.ts
tests/registry/package-registry.test.ts
tests/run/schema-run.test.ts
tests/run/discovery-run.test.ts
tests/scaffold/aliases.test.ts
tests/scaffold/preservation.test.ts
tests/scaffold/reversion.test.ts
```

Keep every existing assertion and add the explicit edited-file preservation
test from Step 1.

- [ ] **Step 7: Point the temporary facade at both owners**

Add `@damatjs/module-generator` to the legacy package dependencies and replace
its root with:

```ts
export * from "@damatjs/schema-codegen";
export * from "@damatjs/module-generator";
```

At this checkpoint, the old package contains only its facade source and tests.

- [ ] **Step 8: Run focused verification**

Run:

```bash
bun install
bun run --cwd packages/module-generator build
bun test packages/module-generator/src/tests
bun run --cwd packages/module-generator lint
bun run --cwd packages/core/codegen build
bun scripts/check-code-lines.ts packages/module-generator packages/core/codegen
git diff --name-only 48fbbc1 -- '*.ts' | xargs bun scripts/check-code-lines.ts
```

Expected: all pass, scaffold edits survive, and barrel output stays
deterministic.

- [ ] **Step 9: Commit Task 2**

```bash
git add packages/module-generator packages/core/codegen bun.lock
git commit -m "feat: extract Damat module generator"
```

---

### Task 3: Migrate Every Internal Consumer to Its Owner

**Files:**

- Modify: `packages/cli/codegen/package.json`
- Modify: `packages/cli/codegen/src/commands/**/*.ts`
- Modify: `packages/cli/codegen/src/tests/codegen/context.ts`
- Modify: `packages/module/package.json`
- Modify: `packages/module/src/tooling/codegen.ts`
- Modify: `packages/orm/cli/package.json`
- Modify: `packages/orm/cli/src/cli/commands/generate/types.ts`
- Modify: `packages/link/package.json`
- Modify: `packages/link/src/tests/pipeline.test.ts`
- Modify: `packages/cli/module/package.json`
- Modify: `packages/cli/module/src/tests/moduleHandlers/fixture.ts`
- Modify any remaining internal import found by repository search

**Interfaces:**

- CLI/module tooling consume `@damatjs/module-generator`
- ORM/link pure generation consume `@damatjs/schema-codegen`
- No internal package consumes `@damatjs/codegen`

- [ ] **Step 1: Add a failing repository boundary checker**

Create `scripts/check-codegen-boundaries.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["packages", "backend", "apps", "scripts"];
const failures: string[] = [];

function allowed(file: string): boolean {
  return (
    file.startsWith("packages/core/codegen/") ||
    file === "scripts/check-codegen-boundaries.ts"
  );
}

function visit(path: string): void {
  for (const name of readdirSync(path)) {
    if (name === "dist" || name === "node_modules" || name === ".turbo")
      continue;
    const file = join(path, name);
    if (statSync(file).isDirectory()) visit(file);
    else if (/\.(ts|tsx|json)$/.test(file)) {
      const text = readFileSync(file, "utf8");
      if (text.includes("@damatjs/codegen") && !allowed(file))
        failures.push(file);
    }
  }
}

roots.forEach(visit);
if (failures.length)
  throw new Error(`Legacy codegen imports:\n${failures.join("\n")}`);
```

Add root script:

```json
"check:codegen-boundaries": "bun scripts/check-codegen-boundaries.ts"
```

- [ ] **Step 2: Run the checker and confirm current imports fail**

Run:

```bash
bun run check:codegen-boundaries
```

Expected: FAIL listing CLI, module, ORM CLI, link tests, and test mocks.

- [ ] **Step 3: Migrate CLI codegen**

Replace command imports with:

```ts
import { generateBarrels, runCodegen } from "@damatjs/module-generator";
```

Replace `@damatjs/codegen` with `@damatjs/module-generator` in CLI mocks.
Rename `realCodegen` to `realModuleGenerator` so test terminology matches
ownership. Replace the package dependency accordingly.

- [ ] **Step 4: Migrate module tooling and CLI module mocks**

In `packages/module/src/tooling/codegen.ts`:

```ts
import {
  runCodegen,
  type RunModuleCodegenResult,
} from "@damatjs/module-generator";
```

Replace the module package dependency. Remove the unnecessary legacy-codegen
mock from CLI module tests if production no longer imports it; otherwise mock
the exact owner package used by production.

- [ ] **Step 5: Migrate ORM and link consumers**

Use:

```ts
const { generateFilesMap } = await import("@damatjs/schema-codegen");
```

in ORM CLI, and:

```ts
import { generateFilesMap } from "@damatjs/schema-codegen";
```

in link tests or runtime code. Replace package dependencies/devDependencies.

- [ ] **Step 6: Run the boundary checker until clean**

Run:

```bash
bun run check:codegen-boundaries
rg -n '@damatjs/codegen' packages backend apps scripts \
  --glob '!**/dist/**' --glob '!**/CHANGELOG.md'
```

Expected: the checker passes; search results are limited to the facade,
compatibility test, and package/release history intentionally handled later.

- [ ] **Step 7: Run affected consumer verification**

Run:

```bash
bun install
bun test packages/cli/codegen/src/tests
bun test packages/module
bun test packages/orm/cli/src/tests
bun test packages/link/src/tests
bun run --cwd packages/cli/codegen build
bun run --cwd packages/module build
bun run --cwd packages/orm/cli build
bun run --cwd packages/link build
git diff --name-only 48fbbc1 -- '*.ts' | xargs bun scripts/check-code-lines.ts
```

Expected: all pass with no internal legacy import.

- [ ] **Step 8: Commit Task 3**

```bash
git add packages/cli packages/module packages/orm packages/link scripts package.json bun.lock
git commit -m "refactor: migrate codegen consumers to owner packages"
```

---

### Task 4: Finalize the Deprecated Compatibility Facade

**Files:**

- Modify: `packages/core/codegen/package.json`
- Replace: `packages/core/codegen/src/index.ts`
- Create: `packages/core/codegen/src/types/index.ts`
- Create: `packages/core/codegen/src/tests/compatibility.test.ts`
- Delete: remaining legacy implementation directories from codegen

**Interfaces:**

- Re-exports legacy root API from both owner packages
- Keeps `@damatjs/codegen/types` resolving
- Contains no warnings, filesystem work, or generation logic

- [ ] **Step 1: Write failing facade identity tests**

Create `compatibility.test.ts`:

```ts
import { expect, test } from "bun:test";
import * as legacy from "../index";
import * as schema from "@damatjs/schema-codegen";
import * as generator from "@damatjs/module-generator";

test("legacy schema exports are owner exports", () => {
  expect(legacy.generateFilesMap).toBe(schema.generateFilesMap);
  expect(legacy.generateTypes).toBe(schema.generateTypes);
});

test("legacy Damat exports are owner exports", () => {
  expect(legacy.runCodegen).toBe(generator.runCodegen);
  expect(legacy.generateBarrels).toBe(generator.generateBarrels);
});
```

- [ ] **Step 2: Verify the facade has no implementation**

Replace `src/index.ts` with:

```ts
/** @deprecated Import pure APIs from @damatjs/schema-codegen. */
export * from "@damatjs/schema-codegen";

/** @deprecated Import Damat generators from @damatjs/module-generator. */
export * from "@damatjs/module-generator";
```

Create `src/types/index.ts`:

```ts
/** @deprecated Import generation types from their owner packages. */
export type * from "@damatjs/schema-codegen";
export type * from "@damatjs/module-generator";
```

Keep only the two owner packages as runtime dependencies. Change the package
description and keywords to identify the replacement without relying on npm
publication commands:

```json
"description": "Deprecated compatibility facade for Damat code generation",
"keywords": [
  "deprecated",
  "@damatjs/schema-codegen",
  "@damatjs/module-generator"
]
```

Do not add a warning call or side-effect module.

- [ ] **Step 3: Run facade and boundary tests**

Run:

```bash
bun run --cwd packages/core/schema-codegen build
bun run --cwd packages/module-generator build
bun run --cwd packages/core/codegen build
bun test packages/core/codegen/src/tests
bun run check:codegen-boundaries
```

Expected: identity tests pass and the boundary checker stays clean.

- [ ] **Step 4: Commit Task 4**

```bash
git add packages/core/codegen bun.lock
git commit -m "refactor: deprecate legacy codegen package"
```

---

### Task 5: Update Living Documentation and Release Records

**Files:**

- Update: `AGENTS.md`
- Update: `docs/guide/01-introduction.md`
- Update: `docs/guide/13-authoring-modules.md`
- Update: `docs/guide/18-cli-reference.md`
- Update: `docs/guide/20-package-reference.md`
- Update: `docs/guide.json`
- Update: affected package READMEs/docs that teach legacy ownership
- Rewrite: `packages/core/codegen/README.md`
- Rewrite: `packages/core/codegen/docs/README.md`
- Create: `releases/schema-codegen/README.md`
- Create: `releases/schema-codegen/next.md`
- Create: `releases/module-generator/README.md`
- Create: `releases/module-generator/next.md`
- Update: `releases/codegen/README.md`
- Update: `releases/codegen/next.md`
- Update: `releases/README.md`

**Interfaces:**

- Living docs teach owner packages as the current architecture
- Release notes alone describe the move and deprecation history

- [ ] **Step 1: Update package documentation**

Document:

```text
@damatjs/schema-codegen
  Input: ModuleSchema
  Output: TypeScript/Zod strings and file maps
  Side effects: none

@damatjs/module-generator
  Input: schema or resolved models plus output paths
  Output: generated files, registries, CRUD scaffolds, barrels
  Side effects: filesystem writes

@damatjs/codegen
  Status: compatibility-only
  New code: do not import
```

Living docs must not mention version history or use “deprecated since”.

- [ ] **Step 2: Update guide and machine index**

Replace current package references so commands are described as
`@damatjs/cli-codegen` adapters over `@damatjs/module-generator`, which consumes
`@damatjs/schema-codegen`. Rebuild `docs/guide.json` using its existing builder:

```bash
bun docs/build-guide-json.ts
```

- [ ] **Step 3: Add release records**

Add `next.md` records for the two new packages and legacy codegen. The codegen
action-required section must say:

```markdown
1. For `ModuleSchema` to TypeScript/Zod generation, replace
   `@damatjs/codegen` with `@damatjs/schema-codegen`.
2. For Damat discovery, registries, scaffolds, or barrels, replace it with
   `@damatjs/module-generator`.
3. Existing imports continue to work during the v1 compatibility window.
```

Add both packages to the top release index and package map.

- [ ] **Step 4: Verify docs and references**

Run:

```bash
./node_modules/.bin/prettier --check AGENTS.md docs packages/core/codegen packages/core/schema-codegen packages/module-generator releases
rg -n '@damatjs/codegen' packages docs AGENTS.md \
  --glob '!**/CHANGELOG.md' --glob '!releases/**'
bun run check:codegen-boundaries
```

Expected: living references to legacy codegen are compatibility explanations,
not instructions for internal or new code.

- [ ] **Step 5: Commit Task 5**

```bash
git add AGENTS.md docs packages releases
git commit -m "docs: document split codegen ownership"
```

---

### Task 6: Prove Equivalence and Complete Phase 6

**Files:**

- Create: golden fixture helpers only if existing assertions cannot be shared
- Update: `docs/superpowers/plans/2026-07-15-damat-v1-roadmap.md`
- Update: `docs/superpowers/specs/2026-07-16-codegen-package-split-design.md`

**Interfaces:**

- Exit gate: pure schema package has no Damat/framework dependency
- Exit gate: module generator consumes schema package
- Exit gate: no internal legacy imports
- Exit gate: output equivalence and scaffold preservation proven

- [ ] **Step 1: Add an explicit golden equivalence test**

Create
`packages/core/codegen/src/tests/generated-output-equivalence.test.ts`:

```ts
import { expect, test } from "bun:test";
import * as legacy from "../index";
import * as schema from "@damatjs/schema-codegen";
import { fixtureSchema } from "./support/fixtureSchema";

test("legacy and owner packages produce byte-identical schema files", () => {
  const owner = schema.generateFilesMap(fixtureSchema, { banner: false });
  const compatible = legacy.generateFilesMap(fixtureSchema, { banner: false });
  expect([...compatible]).toEqual([...owner]);
});
```

Keep the fixture helper below 100 lines and include enums, nullable fields, an
array, and a relationship.

- [ ] **Step 2: Run full focused package verification**

Run:

```bash
bun test packages/core/schema-codegen/src/tests
bun test packages/module-generator/src/tests
bun test packages/core/codegen/src/tests
bun test packages/cli/codegen/src/tests
bun test packages/module
bun test packages/orm/cli/src/tests
bun test packages/link/src/tests
```

Expected: all tests pass.

- [ ] **Step 3: Run build, lint, type, format, boundary, and line checks**

Run:

```bash
bun run build
bun run lint
bun run check-types
bun run check:codegen-boundaries
git diff --name-only 48fbbc1 -- '*.ts' | xargs bun scripts/check-code-lines.ts
./node_modules/.bin/prettier --check .
git diff --check
```

Expected: all commands pass.

- [ ] **Step 4: Mark Phase 6 complete**

Set Phase 6 to complete in the roadmap and change the design status from
`Approved` to `Implemented`. Record the final test/build totals in the task
report, not in living package documentation.

- [ ] **Step 5: Commit Task 6**

```bash
git add docs/superpowers packages scripts package.json bun.lock
git commit -m "feat: complete codegen package split phase"
```

Do not push.

---

## Task Reporting Template

After each task, report:

```text
Task N complete
- Outcome:
- Packages/files:
- Tests:
- Build/lint/types:
- 100-line check:
- Commit:
- Remaining Phase 6 tasks:
```

Wait for user approval before starting the next task.
