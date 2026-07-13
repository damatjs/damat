# The `module` command group

`moduleCommand` (`src/command/module/index.ts`, alias `m`) groups the
module-authoring and module-installation subcommands. Running `damat module`
with no subcommand prints a cheat-sheet split into "Authoring (inside a module
package)" and "App side (inside a backend)".

```
module (parent, prints cheat-sheet)
├─ add <source>          install a module into the app   (helpers/* + @damatjs/module)
├─ remove <id> / rm      inverse of add                   (moduleLayoutPaths + config/alias removal)
├─ update <id> / up      re-fetch from recorded source    (diff + force reinstall)
├─ list / ls             list installed modules          (scan src/modules + config)
├─ init <name>           scaffold a standalone package    (scaffold/templates/*)
├─ dev                   run a module package standalone  (.damat/module-dev-entry.ts)
├─ migration:create      diff models → migration          (createModuleMigration)
├─ migration:run         apply migrations                 (runModuleMigration)
├─ migration:status      applied vs pending               (runModuleMigrationStatus)
├─ codegen               row types + zod schemas          (generateModuleTypes)
├─ validate              contract / registry readiness     (validateModuleDir)
├─ build / b             type-check + validate (release)   (shared/typecheck + validateModuleDir)
└─ publish / pub         pack + PUT to registry gateway    (tar + <gateway>/api/npm/<name>)
```

Subcommands divide cleanly: **`add`/`remove`/`update`/`list`** run inside an
app; **`init`/`dev`/`migration:create`/`migration:run`/`migration:status`/
`codegen`/`validate`/`build`/`publish`** run inside (or create) a single module
package, delegating to `@damatjs/module`.

---

## `add <source>` — `src/command/module/add.ts`

Install a module shadcn-style: fetch it, copy its source into the app, register
it in config, sync env, install packages. This is the only command that mutates
the surrounding project.

Options: `--name`/`-n` (override module id; must be a single kebab-case
segment), `--dir`/`-d` (target modules dir, default `src/modules`; must be a
relative path with no `..` segments), `--force`/`-f` (overwrite existing
target), `--allow-unverified` (opt in to path/git sources, which carry no
registry verification, and to `file:`/`git`/url dependency ranges),
`--allow-scripts` (run dependency lifecycle scripts during `bun add`; skipped
by default).

Examples (from the command's `examples`):

```bash
damat module add user-management                         # registry ref
damat module add damatjs/user-management@0.0.1
damat module add ./local/path/to/module-package --allow-unverified
damat module add https://github.com/damatjs/modules.git#main --allow-unverified
```

End-to-end flow:

1. **Resolve the source** → `resolveModuleSource(source, ctx.cwd)` (see
   [helpers](#add-helpers)). Returns `{ dir, cleanup, origin, registry? }`.
2. **Locate + read manifest**: `locateModuleDir(resolved.dir)` (handles
   package-layout `src/` vs legacy root), then `readModuleManifest(...)` (both
   from `@damatjs/module`).
3. **Module id + path guards** (`helpers/guard.ts`): `--name` override, else
   `manifest.name`. `moduleIdError` requires a single kebab-case segment
   (`/^[a-z][a-z0-9-]*$/` — same rule as the manifest) and `modulesDirError`
   requires a relative `--dir` with no `..` segments, so neither can traverse
   outside the app. Target is `<cwd>/<dir>/<id>`; relative target string
   `./<dir>/<id>`.
4. **Provenance + verification gate** (runs for every source, before any
   write):
   - Registry source → `evaluateVerification(resolved.registry.verification)`.
     Logs source/owner/status; if `!decision.allowed` → error, return `1`; a
     warning message is logged when present.
   - Path/git source → logged as `from: path|git`, then
     `unverifiedSourceError`: **refused** unless `--allow-unverified` was
     passed (or `DAMAT_MODULE_VERIFY=off`, the existing "install anything"
     policy). Accepted sources must additionally pass
     `validateModuleDir(sourceModuleDir)` — structural errors block the
     install.
5. **Package spec gate**: `collectModulePackages(resolved.dir, manifest)` then
   `invalidPackageSpecs(packages, { allowUnsafeRanges: allowUnverified })` —
   names must match the npm name grammar and ranges must look like a semver
   range/dist-tag (no whitespace, `file:`, `git+`, urls, or flag-like strings;
   protocol ranges are allowed only with `--allow-unverified`). Any offender →
   error, return `1` before a single file is written.
6. **Dependency check**: for each `manifest.modules` not present under the target
   dir → `logger.warn` (not a blocker).
7. **Existing target**: if it exists and not `--force` → error, return `1`; with
   `--force` → `rmSync` it.
8. **Copy**: `copyModule(sourceModuleDir, targetDir)` — copies only the module
   source (excludes `.git`/`node_modules`); package scaffolding stays behind.
9. **Register**: `registerModuleInConfig(<cwd>/damat.config.ts, id,
   relativeTarget, origin)` where `origin = { ...resolved.origin, installedAt:
   now }`. On `false` → warn with the exact snippet to paste manually.
10. **Env sync**: `syncEnvVars(ctx.cwd, manifest)` → logs vars added to
    `.env.example` and warns about required vars missing from `.env`.
11. **Packages**: `installModulePackages(ctx.cwd, packages, { allowScripts })`
    (`bun add --ignore-scripts …`; the flag is dropped only with
    `--allow-scripts`). On failure → error with `bun add` output, return `1`.
12. **Next steps**: prints `bun damat-orm migrate:up` + restart hint. Returns
    `0`. `resolved.cleanup()` runs in `finally` (removes any temp checkout).

---

## `remove <id>` (aliases `rm`, `uninstall`) — `src/command/module/remove.ts`

The inverse of `add`. Targets come from `moduleLayoutPaths(cwd, id, modulesDir)`
(shared with the installer so the two can never drift): module home, grouped
routes/workflows/links/tests.

Behaviour:

1. Same id/dir traversal guards as `add`; error when neither files nor a config
   entry exist.
2. **Dependents check**: scan sibling modules' `module.json` `modules` arrays;
   refuse (exit 1) while anything depends on the module unless `--force`
   (which warns and proceeds).
3. `--dry-run`: print the full plan (deletes, deregistration, alias removal,
   env block) and exit 0 before any write.
4. `removeModuleSplit` deletes the existing targets and regenerates the
   `src/links/index.ts` aggregator from surviving owners; workflow barrels are
   rebuilt when a workflows dir was removed.
5. `deregisterModuleFromConfig` splices the entry out of `damat.config.ts`
   (brace-counted; conservative false → manual instructions).
   `removeModuleTsconfigPaths` drops only `@<id>/*` (the `@workflows` aliases
   are app-level and stay).
6. `--clean-env` removes the module's `# --- module: <name> ---` block from
   `.env.example` only — `.env` is never touched.
7. Database tables/migrations are **not** rolled back; the next-steps output
   says so.

## `update <id>` (aliases `up`, `upgrade`) — `src/command/module/update.ts`

Re-fetch a module from the provenance `add` recorded (`readModuleConfigEntry`
reads the `source: { ref, … }` block) and force-reinstall it through the same
pipeline.

Behaviour:

1. Requires an installed module **and** a recorded `source.ref` — modules
   installed by hand get pointed at `module add --force` instead.
2. `resolveModuleSource(ref)` + the same verification gates as `add`
   (registry verdict, or `--allow-unverified` for path/git, plus structural
   validation).
3. Diff summary of the module home (content compare, skipping the split-out
   api/workflows/links/tests subtrees): `+ added`, `~ changed (overwritten)`,
   `- removed (deleted)`; changed files are flagged as local-edit hazards.
4. `--dry-run` exits 0 after the diff; otherwise `--yes` is required to apply
   (exit 1 with instructions without it).
5. Apply = `installModuleSplit` with `force: true`, barrel regen, config entry
   re-written with a fresh `installedAt`, `syncEnvVars`, package install.

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

## `migration:run` — `src/command/module/migrationRun.ts`

Apply the module's own migrations. Loads env via `@damatjs/load-env`
(`NODE_ENV || "development"`) and errors up front when `DATABASE_URL` is
unset. `runModuleMigration(ctx.cwd)` (from `@damatjs/module`) does the work;
the command reports "No migrations found" (exit 0), "No pending migrations",
or the list of applied names. A failed migration reports with the module name
and returns `1`.

## `migration:status` — `src/command/module/migrationStatus.ts`

Same env/`DATABASE_URL` preamble, then `runModuleMigrationStatus(ctx.cwd)` —
prints a `"<module>: <n> applied, <m> pending"` headline plus one
applied/pending line per migration. Read-only; returns `1` only on errors.

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

## `build` (alias `b`) — `src/command/module/build.ts`

A verification gate, not a bundle — modules ship as source (`module add`
relocates it), so "build" means the module must **compile** and be
**installable**: `runTypeCheck` (`shared/typecheck.ts`; skip with
`--no-typecheck`) then `locateModuleDir` + `validateModuleDir` (skip with
`--no-validate`). Either failure exits non-zero; success prints "Module build
OK".

## `publish` (alias `pub`) — `src/command/module/publish.ts`

Validate, build, pack, and publish to the registry gateway:

1. Same type-check + contract-validate gates as `build` (`--no-typecheck` /
   `--no-validate` to skip).
2. Read `package.json` (`name`/`version` required) and the `module.json`
   manifest.
3. Resolve the gateway base URL: `--registry` > `DAMAT_PUBLISH_REGISTRY` >
   derived from `DAMAT_MODULE_REGISTRY` (strips `/api/damat/modules…`,
   `/registry.json`, `/api/registry/modules…` — mirrors the MCP's
   `registry/load.ts`). Token: `--token` > `DAMAT_PUBLISH_TOKEN`.
4. `--dry-run` prints the plan (gateway, token presence, tarball name, PUT
   URL) and exits 0 **before** requiring either.
5. Pack `src/`, `module.json`, `package.json` (those that exist) into a temp
   `tar -czf` tarball, then `PUT <gateway>/api/npm/<name>` with an
   npm-publish-shaped JSON body (`versions` + base64 `_attachments`) and a
   `Bearer` token. 401/403 → "invalid or expired publish token"; 400 →
   manifest/package.json hint; anything else surfaces the body. Temp dir is
   cleaned up best-effort.

---

<a id="add-helpers"></a>

## `add` helpers — `src/command/module/helpers/`

`helpers/index.ts` re-exports `types`, `source`, `copy`, `config`, `tsconfig`,
`env`, `packages`, `dependencies`, `guard` (`linkTemplates.ts` is imported
directly, not via the barrel). Key types live in `helpers/types.ts`
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
`invalidPackageSpecs(packages, { allowUnsafeRanges? })` (`packages.ts`) vets
that map: names must match the npm name grammar (≤ 214 chars, optionally
scoped, lowercase URL-safe — a name can never look like a flag) and ranges must
be a plausible semver range/dist-tag; `file:`/`git+`/url ranges pass only with
`allowUnsafeRanges` (wired to `--allow-unverified`), and whitespace/shell
metacharacters never pass. `installModulePackages(appDir, packages,
{ allowScripts? })` turns the map into `name@range` specs (bare name when range
is empty/`*`) and runs `spawnSync("bun", ["add", "--ignore-scripts", ...specs],
{ cwd: appDir })` — `--ignore-scripts` is dropped only when `allowScripts` is
set (`--allow-scripts`). Returns `{ ok, output }`.

### Install guards — `helpers/guard.ts`

`moduleIdError(id)` / `modulesDirError(dir)` return a message (or `null`) when
the module id / `--dir` could be used for path traversal, and
`unverifiedSourceError(originType, allowUnverified, policy?)` implements the
non-registry trust gate (`null` when `--allow-unverified` was passed or the
`DAMAT_MODULE_VERIFY` policy is `off`).

---

## Gotchas

- **`module add` mutates three things** in the app: `src/modules/<id>` (copy),
  `damat.config.ts` (register + provenance), `.env.example` + installed packages.
  Config registration is best-effort and falls back to printed instructions; the
  other steps are not transactional, so a failed `bun add` leaves the copied
  files in place (it returns `1` after the copy).
- **Every source is gated.** Registry installs go through
  `evaluateVerification` (`rejected`/`revoked` modules are always blocked
  regardless of policy); path/git installs are refused unless
  `--allow-unverified` is passed (or `DAMAT_MODULE_VERIFY=off`) and must pass
  `validateModuleDir`. Dependency lifecycle scripts are skipped unless
  `--allow-scripts` is passed.
- **`migration:create` / `codegen` / `validate` operate on `ctx.cwd`** — they
  must be run from inside the module package, and the heavy lifting is in
  `@damatjs/module`, not here.
- **`list` reads provenance via regex**, scoped to each module's own config
  entry; deeply reformatted config files may defeat the scrape (it degrades
  gracefully to no metadata).
- **`@damatjs/module` is the contract.** Changing install/validate/migration
  behaviour usually means changing that package, not these thin commands.
