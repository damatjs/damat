[Damat Guide](../GUIDE.md) › Installing existing modules

# 14. Installing existing modules

`damat module add <source>` installs a module shadcn-style: it reads the
module's `module.json`, **splits the module across the app's layers** (see below),
registers it in `damat.config.ts`, adds its portable tsconfig aliases, regenerates
the workflow barrels, syncs required env vars into `.env.example`, and installs the
npm packages it needs. If the module declares `link` rules, they are seeded into
`src/links/.link-drafts.json` for you to complete (see below).

A module is authored **flat** (`workflows/<table>`, `api/routes/<table>`, `tests/`);
on install the `<moduleId>/` segment is added so nothing collides:

| In the module package | Lands in the app |
| --- | --- |
| models, service, config, types, migrations, `lib/` | `src/modules/<moduleId>/` |
| `api/routes/<table>/` | `src/api/routes/<moduleId>/<table>/` (URL `/<moduleId>/<table>`) |
| `workflows/<table>/` | `src/workflows/<moduleId>/<table>/` |
| `tests/` | `tests/<moduleId>/` |

Generated routes import workflows from the bare `@workflows` barrel, which the
install wires up via the `@workflows` / `@workflows/*` and `@<moduleId>/*` tsconfig
paths it adds.

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

Useful commands:

```bash
damat module list                # what's installed in this app
damat module add <src> --force   # overwrite an existing module
damat module add <src> --name x  # install under a different id
damat module link-setup          # materialize seeded link drafts into src/links/
```

**Module-declared links.** A module can ship cross-module link **rules** in its
`module.json` (`link[]`). It never creates the connection itself — `add` only
seeds an editable draft into `src/links/.link-drafts.json` with the target left
blank. Fill in `to.module` / `to.model`, then run `damat module link-setup` to
generate `src/links/<owner>/` and wire `links:` into `damat.config.ts`. See
[§17.3 → Declaring a link rule from a module](./17-composing-and-linking-modules.md#declaring-a-link-rule-from-a-module-modulejson-link).

**Trust:** registry installs carry an owner + verification status; the install
gate is controlled by `DAMAT_MODULE_VERIFY` (`off` / `warn` / `require`).
`rejected`/`revoked` modules are always blocked. Path and git sources are
trusted as-is (you pointed at them). Details in [MODULES.md](../../MODULES.md).

Prefer to drive this from an AI assistant? See the
[next chapter](./15-installing-modules-with-ai.md).

---

Prev: [← Authoring a module](./13-authoring-modules.md) · [Guide home](../GUIDE.md) · Next: [Installing modules with AI →](./15-installing-modules-with-ai.md)
