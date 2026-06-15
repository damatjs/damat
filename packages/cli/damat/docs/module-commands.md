# The `module` command group

`moduleCommand` (`src/command/module/index.ts`, alias `m`) groups the
module-authoring and module-installation subcommands. Running `damat module`
with no subcommand prints a cheat-sheet split into "Authoring (inside a module
package)" and "App side (inside a backend)".

```
module (parent, prints cheat-sheet)
├─ add <source>          install a module into the app   (helpers/* + @damatjs/module)
├─ list / ls             list installed modules          (scan src/modules + config)
├─ init <name>           scaffold a standalone package    (scaffold/templates.ts)
├─ dev                   run a module package standalone  (.damat/module-dev-entry.ts)
├─ migration:create      diff models → migration          (createModuleMigration)
├─ codegen               row types + zod schemas          (generateModuleTypes)
└─ validate              contract / registry readiness     (validateModuleDir)
```

Subcommands divide cleanly: **`add`/`list`** run inside an app; **`init`/`dev`/
`migration:create`/`codegen`/`validate`** run inside (or create) a single module
package, delegating to `@damatjs/module`.

---

## `add <source>` — `src/command/module/add.ts`

Install a module shadcn-style: fetch it, copy its source into the app, register
it in config, sync env, install packages. This is the only command that mutates
the surrounding project.

Options: `--name`/`-n` (override module id), `--dir`/`-d` (target modules dir,
default `src/modules`), `--force`/`-f` (overwrite existing target).

Examples (from the command's `examples`):

```bash
damat module add user-management                         # registry ref
damat module add damatjs/user-management@0.0.1
damat module add ./local/path/to/module-package
damat module add https://github.com/damatjs/modules.git#main
```

End-to-end flow:

1. **Resolve the source** → `resolveModuleSource(source, ctx.cwd)` (see
   [helpers](#add-helpers)). Returns `{ dir, cleanup, origin, registry? }`.
2. **Locate + read manifest**: `locateModuleDir(resolved.dir)` (handles
   package-layout `src/` vs legacy root), then `readModuleManifest(...)` (both
   from `@damatjs/module`).
3. **Module id**: `--name` override, else `manifest.name`. Target is
   `<cwd>/<dir>/<id>`; relative target string `./<dir>/<id>`.
4. **Provenance + verification gate**:
   - Registry source → `evaluateVerification(resolved.registry.verification)`.
     Logs source/owner/status; if `!decision.allowed` → error, return `1`; a
     warning message is logged when present.
   - Path/git source → logged as `from: path|git` and trusted as-is.
5. **Dependency check**: for each `manifest.modules` not present under the target
   dir → `logger.warn` (not a blocker).
6. **Existing target**: if it exists and not `--force` → error, return `1`; with
   `--force` → `rmSync` it.
7. **Copy**: `copyModule(sourceModuleDir, targetDir)` — copies only the module
   source (excludes `.git`/`node_modules`); package scaffolding stays behind.
8. **Register**: `registerModuleInConfig(<cwd>/damat.config.ts, id,
   relativeTarget, origin)` where `origin = { ...resolved.origin, installedAt:
   now }`. On `false` → warn with the exact snippet to paste manually.
9. **Env sync**: `syncEnvVars(ctx.cwd, manifest)` → logs vars added to
   `.env.example` and warns about required vars missing from `.env`.
10. **Packages**: `collectModulePackages(resolved.dir, manifest)` then
    `installModulePackages(ctx.cwd, packages)` (`bun add …`). On failure → error
    with `bun add` output, return `1`.
11. **Next steps**: prints `bun damat-orm migrate:up` + restart hint. Returns
    `0`. `resolved.cleanup()` runs in `finally` (removes any temp checkout).

---

## `list` (alias `ls`) — `src/command/module/list.ts`

List modules installed under `--dir`/`-d` (default `src/modules`). No network.

Behaviour:

1. If the modules dir is absent → info message, return `0`.
2. Read `<cwd>/damat.config.ts` (if present) as text for registration/provenance
   detection.
3. For each subdirectory: read `<dir>/<name>/module.json`
   (`MODULE_MANIFEST_FILENAME`) for version/description (falls back to
   `(no module.json)` / `(invalid module.json)`).
4. `registered` = regex test for the module name as a config key.
5. `readProvenance(configContent, name)` — best-effort regex scrape of the
   module's `source: { type, owner, verification }` block, scoped to its own
   entry (entries close with a 4-space `},`).
6. Log `"<name>@<version> [registered] | [NOT in damat.config.ts]"` with
   `{ description, from, owner, verification }` metadata.

---

## `init <name>` — `src/command/module/init.ts`

Scaffold a new standalone module package. Name must match
`/^[a-z][a-z0-9-]*$/` (kebab-case). See [scaffolding.md](./scaffolding.md) for
the templates.

Behaviour:

1. Validate the name; error on bad/missing name.
2. `targetDir = <cwd>/<--dir or name>`. Error if it already exists.
3. `serviceClass = <Pascal(name)>Service`.
4. Create dirs: `src/models`, `src/migrations`, `src/workflows`,
   `src/api/routes`, `src/config/schema`, `tests`.
5. Write the file map (package.json, tsconfig, module.config.ts, .env.example,
   .gitignore, src/module.json, src/index.ts, src/service.ts, src/accessor.ts,
   src/config/*, tests/contract.test.ts) — each parent dir is `mkdir -p`'d.
6. Print next-steps (cd, install, add models, `migration:create`, `codegen`,
   `dev`, `test`). Return `0`.

The generated `package.json` scripts map straight to this CLI:
`dev` → `damat module dev`, `migration:create`/`codegen`/`validate` likewise.

---

## `dev` — `src/command/module/dev.ts`

Run the **current module package** standalone with hot reload. Option:
`--port`/`-p` (no default; only set when provided).

Behaviour: ensure `.damat/`; write `<cwd>/.damat/module-dev-entry.ts`:

```ts
import { runModuleEntry } from '@damatjs/module';
runModuleEntry();
```

`loadEnv(NODE_ENV || "development", ctx.cwd)`; `spawn(["bun", "--watch",
"--no-clear-screen", entryFile])` with `PORT` added to env only if `--port` was
given; await exit; best-effort `unlinkSync`. (Mirrors the app `dev` command but
boots the module runtime instead of the app entry.)

---

## `migration:create` — `src/command/module/migrationCreate.ts`

`createModuleMigration(ctx.cwd)` (from `@damatjs/module`) — diffs the module's
models against its snapshot. If `result.hasChanges && result.filePath` →
success with the path; else "No schema changes detected". Errors → `error`,
return `1`.

## `codegen` — `src/command/module/codegen.ts`

`generateModuleTypes(ctx.cwd, ctx.logger)` (from `@damatjs/module`) — generates
row types + zod schemas. Logs `Generated <n> files in <outputDir>`. Errors →
return `1`.

## `validate` — `src/command/module/validate.ts`

`locateModuleDir(ctx.cwd)` then `validateModuleDir(moduleDir)` (both from
`@damatjs/module`). Logs each `report.errors` (error) and `report.warnings`
(warn). If valid with no warnings → success ("valid and registry-ready"); valid
with warnings → info ("fix the warnings before publishing"). Returns
`report.valid ? 0 : 1`.

---

<a id="add-helpers"></a>

## `add` helpers — `src/command/module/helpers/`

`helpers/index.ts` re-exports `types`, `source`, `copy`, `config`, `env`,
`packages`, `dependencies`. Key types live in `helpers/types.ts`
(`ResolvedModuleSource`, `EnvSyncResult`, `PackageInstallResult`).

### Source resolution — `helpers/source.ts`

```ts
resolveModuleSource(source: string, cwd: string): Promise<ResolvedModuleSource>
```

Tries, in order:

1. **Local path** — `isAbsolute(source) ? source : resolve(cwd, source)`; if it
   exists → `{ dir, cleanup: noop, origin: { type: "path", ref, url } }`.
2. **Registry ref** — `parseModuleRef(source)`; if it parses,
   `resolveRegistryEntry(ref)` (reads `DAMAT_MODULE_REGISTRY`). On a record,
   recursively resolve `record.source`, then return it with `registry: record`
   and `origin.type = "registry"` (carrying version/owner/verification/integrity).
   A **bare name** (no `/`) that no registry knows → throws a helpful error; an
   `a/b` form falls through to git (could be a github shorthand).
3. **Git source** — split off `#ref`; recognise `https://`/`git@` URLs and
   `user/repo[/sub/dir]` github shorthand. `git clone --depth 1 [--branch ref]`
   into a `mkdtemp` dir; `subDir` selects a path inside the checkout;
   `cleanup` removes the temp dir. `origin.type = "git"`.

Anything that matches none → throws "neither an existing path nor a recognizable
git source".

### Copy — `helpers/copy.ts`

`copyModule(sourceDir, targetDir)` — `cpSync(..., { recursive: true })` with a
`filter` that excludes any `.git` and `node_modules` paths.

### Config registration — `helpers/config.ts`

`registerModuleInConfig(configPath, name, resolvePath, source?)` → `boolean`.

- Returns `false` if the config file is missing.
- Computes a key: camelCase identifier if valid, else a quoted string.
- If the module is already registered with the same `resolve` → returns `true`
  (idempotent no-op).
- Builds the entry `{ resolve, id, source? }` (provenance via
  `serializeSource`, fixed field order: type, ref, url, version, owner,
  verification, integrity, installedAt).
- **Insertion strategy**: find `modules: {` and insert right after the brace
  (handling the `modules: {}` empty case); otherwise insert a fresh `modules: {
  … }` block before the closing `})` of `defineConfig({ … })`.
- If neither anchor is found → returns `false` (caller prints manual steps).

### Env sync — `helpers/env.ts`

`syncEnvVars(appDir, manifest): EnvSyncResult`. For each `manifest.env` entry:
appends to `.env.example` (with the `# description` comment + `name=example`)
when not already defined there, recording it in `addedToExample`; records the
name in `missingInEnv` when it is `required` (default true) and absent from
`.env`. Appended vars are grouped under a `# --- module: <name> ---` header.

### Packages — `helpers/packages.ts` + `helpers/dependencies.ts`

`collectModulePackages(packageRoot, manifest)` (`dependencies.ts`) merges the
module package's own `dependencies` (skipping the `@damatjs/*` stack the host
already provides) with `manifest.packages` overrides into a `name -> range` map.
`installModulePackages(appDir, packages)` (`packages.ts`) turns the map into
`name@range` specs (bare name when range is empty/`*`) and runs
`spawnSync("bun", ["add", ...specs], { cwd: appDir })`, returning
`{ ok, output }`.

---

## Gotchas

- **`module add` mutates three things** in the app: `src/modules/<id>` (copy),
  `damat.config.ts` (register + provenance), `.env.example` + installed packages.
  Config registration is best-effort and falls back to printed instructions; the
  other steps are not transactional, so a failed `bun add` leaves the copied
  files in place (it returns `1` after the copy).
- **Verification only applies to registry sources.** Path and git installs are
  trusted; `rejected`/`revoked` registry modules are always blocked regardless of
  policy.
- **`migration:create` / `codegen` / `validate` operate on `ctx.cwd`** — they
  must be run from inside the module package, and the heavy lifting is in
  `@damatjs/module`, not here.
- **`list` reads provenance via regex**, scoped to each module's own config
  entry; deeply reformatted config files may defeat the scrape (it degrades
  gracefully to no metadata).
- **`@damatjs/module` is the contract.** Changing install/validate/migration
  behaviour usually means changing that package, not these thin commands.
