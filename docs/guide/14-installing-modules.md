[Damat Guide](../GUIDE.md) › Installing existing modules

# 14. Installing existing modules

`damat module add <source>` reads a provider `damat.json`, matches its named
capabilities to the backend's optional receiver profile, and creates one
transactional installation plan. The source may be a registry ref, local path
or directory, Git/GitHub source, npm artifact, or tarball.

```bash
damat module plan ./modules/user
damat module add ./modules/user
damat module list
damat module update user --yes
damat module remove user --yes
```

Source is the default and stable mode. It installs editable files, records
checksums and immutable provenance in `damat.lock.json`, blocks collisions,
backs up only confirmed modified owned files, and scans for remaining usage
before removal.

## Profiles and overrides

The provider declares `install.provides`; a backend created by `damat create`
declares `install.accepts`. Destination selection is:

1. `--target capability=path`
2. matching receiver accept
3. provider `fallbackTo`
4. a named planning error

A backend `damat.json` is optional when every provider capability has a
fallback or the caller supplies overrides. Use `--mode source|package` to
override the provider default.

## User-owned integration

The installer never edits `damat.config.ts`, `tsconfig.json`, `.env*`, route or
workflow barrels, or call sites. Add/update/remove reports the exact integration
work declared by the provider. The user or AI owns those shared files.

After a source install, review those notices, register the module, apply its
migrations, and restart the backend:

```bash
bun damat-orm migrate:up
```

## Package backends

Package mode is early alpha and requires `--experimental-package` plus an
explicit or default backend:

```bash
damat module add npm:@acme/user@1.0.0 \
  --mode package --package-backend node --experimental-package

damat module add ./modules/user \
  --mode package --package-backend damat --experimental-package
```

Node delegates to the target's Bun/npm/pnpm/Yarn installation. Damat stores a
self-contained immutable artifact under `.damat/packages`; artifacts with
external runtime dependencies are rejected. The framework accepts both package
locations through `ModuleConfig.resolve`, runs declared migrations in place,
mounts declared routes, and loads workflow, job, event, and pipeline providers.
Package mode remains early alpha; source mode is the stable, recommended path.

## Trust

Registry installs preserve owner, verification, integrity, and pinned source
metadata. Rejected and revoked entries are always blocked. Configure registry
resolution with `DAMAT_REGISTRY` or the compatibility
`DAMAT_MODULE_REGISTRY`. Direct origins are recorded as unverified provenance.

Legacy `module.json` remains readable during the 0.x migration window. New
module scaffolds write only root `damat.json`.

Prev: [← Authoring a module](./13-authoring-modules.md) · [Guide home](../GUIDE.md) · Next: [Publishing modules →](./14b-publishing-modules.md)
