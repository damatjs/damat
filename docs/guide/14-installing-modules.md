[Damat Guide](../GUIDE.md) › Installing existing modules

# 14. Installing existing modules

`damat module add <source>` installs a module shadcn-style: it reads the
module's `module.json`, copies the source into `src/modules/<id>`, registers it
in `damat.config.ts`, syncs required env vars into `.env.example`, and installs
the npm packages it needs.

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
```

**Trust:** registry installs carry an owner + verification status; the install
gate is controlled by `DAMAT_MODULE_VERIFY` (`off` / `warn` / `require`).
`rejected`/`revoked` modules are always blocked. Path and git sources are
trusted as-is (you pointed at them). Details in [MODULES.md](../../MODULES.md).

Prefer to drive this from an AI assistant? See the
[next chapter](./15-installing-modules-with-ai.md).

---

Prev: [← Authoring a module](./13-authoring-modules.md) · [Guide home](../GUIDE.md) · Next: [Installing modules with AI →](./15-installing-modules-with-ai.md)
