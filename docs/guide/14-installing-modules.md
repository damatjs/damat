[Damat Guide](../GUIDE.md) › Installing existing modules

# 14. Installing existing modules

`damat module add <source>` installs a module shadcn-style: it reads the module's
`module.json`, **splits the module across the app's layers** (below), registers it
in `damat.config.ts`, adds its portable tsconfig aliases, regenerates the workflow
barrels, syncs required env vars into `.env.example`, and installs the npm packages
it needs.

## The layer split

A module is authored **flat** (`workflows/<table>`, `api/routes/<table>`,
`links/models/`, `tests/`); on install a `<moduleId>/` segment is added so two
modules never collide:

| In the module package                              | Lands in the app                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| models, service, config, types, migrations, `lib/` | `src/modules/<moduleId>/`                                        |
| `api/routes/<table>/`                              | `src/api/routes/<moduleId>/<table>/` (URL `/<moduleId>/<table>`) |
| `workflows/<table>/`                               | `src/workflows/<moduleId>/<table>/`                              |
| `links/models/<x>.ts`                              | `src/links/<moduleId>/models/<x>.ts`                             |
| `tests/`                                           | `tests/<moduleId>/`                                              |

Generated routes import workflows from the bare `@workflows` barrel, which the
install wires up via the `@workflows` / `@workflows/*` and `@<moduleId>/*` tsconfig
paths it adds.

## Installing from a source

The source can be a registry ref, a local path, a github shorthand, or a git URL:

```bash
# from a registry ref (requires DAMAT_MODULE_REGISTRY)
damat module add damatjs/user@0.2.0

# from a local path
damat module add ./packages/modules/user

# from a github shorthand or git URL
damat module add damatjs/modules/user
damat module add https://github.com/damatjs/modules.git#main

# then apply the module's migrations and restart the dev server
bun damat-orm migrate:up
```

Add `--dry-run` to preview every file placement before writing anything.

## Managing installed modules

```bash
damat module list                 # what's installed in this app (+ provenance)
damat module add <src> --force    # overwrite an existing module (incl. shipped link files)
damat module add <src> --name x   # install under a different id
damat module remove <id>          # uninstall: delete files, deregister config, drop aliases
damat module update <id>          # re-fetch from the recorded source, diff, reinstall
```

- **`remove`** is the inverse of `add`: it deletes the module's files, deregisters
  it from `damat.config.ts`, and drops its tsconfig alias. It **refuses** while
  another installed module depends on it (unless `--force`); `--dry-run` previews
  the deletion and `--clean-env` also strips the module's block from
  `.env.example` (never `.env`). Database tables and applied migrations are _not_
  rolled back.
- **`update`** re-resolves the source `add` recorded in `damat.config.ts`, shows a
  version + file diff (flagging any locally edited files it would overwrite), and
  reinstalls when you confirm with `--yes`.

## Module-shipped links

A module can ship cross-module link files (a real `defineLink`) under
`links/models/`. On `add` they split into `src/links/<moduleId>/`, the owner index

- top-level aggregator are regenerated, and `links: "./src/links"` is ensured in
  `damat.config.ts`. The link is **dormant** until you run
  `damat-orm migrate:create link:<moduleId>` + `migrate:up`, and harmless if its
  target module isn't installed. The copied files are yours to edit (e.g. to point
  at a target installed under a different id) — a re-install won't clobber them
  unless you pass `--force`. See
  [§17.3 → Links shipped by a module](./17-composing-and-linking-modules.md#links-shipped-by-a-module).

## Trust & verification

Registry installs carry an owner + verification status; the install gate is
controlled by `DAMAT_MODULE_VERIFY` (`off` / `warn` / `require`).
`rejected`/`revoked` modules are always blocked. Path and git sources are trusted
as-is (you pointed at them). Details in [MODULES.md](../../MODULES.md).

Prefer to drive this from an AI assistant? See the
[next chapter](./15-installing-modules-with-ai.md).

---

Prev: [← Authoring a module](./13-authoring-modules.md) · [Guide home](../GUIDE.md) · Next: [Publishing modules →](./14b-publishing-modules.md)
