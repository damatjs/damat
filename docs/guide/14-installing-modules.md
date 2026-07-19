[Damat Guide](../GUIDE.md) › Installing modules

# 14. Installing existing modules

`damat module add <source>` reads a provider `damat.json`, matches its named
capabilities to the backend's receiver profile, and builds one transactional
installation plan. A source may be a registry reference, local path, Git/GitHub
origin, npm artifact, or tarball.

Always inspect unfamiliar work first:

```bash
damat module plan ./modules/user
damat module add ./modules/user
damat module list
```

Installed files, checksums, and immutable provenance are recorded in
`damat.lock.json`. Collisions are blocked. Updates and removals compare owned
content and scan for remaining usage.

## Capability routing

The provider declares `install.provides`; a backend created by `damat create`
declares `install.accepts`. A destination is selected in this order:

1. explicit `--target capability=path`;
2. matching receiver `accepts`;
3. provider `fallbackTo`;
4. a planning error.

Source mode is the normal editable installation path. `--mode source|package`
overrides the provider default.

## Shared application policy stays user-owned

The installer never silently edits:

- `damat.config.ts`;
- TypeScript aliases;
- `.env` or `.env.example`;
- route/workflow/job/event/pipeline barrels;
- application call sites;
- authentication or operational routes.

The installation report includes the provider's integration instructions and
the exact locations that need review. After installation:

1. register the module in `damat.config.ts`;
2. add/import its route, workflow, job, event, pipeline, or link capabilities;
3. add declared environment values;
4. update any required aliases/barrels;
5. apply migrations;
6. restart the backend.

```bash
bun run db:migrate
bun run db:status
```

Use `bun run db:setup` only when the configured database itself may not exist.

## Package mode

Package mode resolves immutable artifacts through either a Node package manager
backend or Damat's package store. It requires the explicit package-mode gate:

```bash
damat module add npm:@acme/user@1.0.0 \
  --mode package \
  --package-backend node \
  --experimental-package
```

The runtime loads declared migrations, routes, workflows, jobs, events, and
pipelines from the resolved package location. Source and package installations
share the same manifest identities, capability names, integration ownership,
and trust checks.

## Trust

Registry entries preserve owner, verification, integrity, and pinned source
metadata. Rejected and revoked artifacts are always blocked. Configure registry
resolution with `DAMAT_REGISTRY` or the module-registry compatibility variable.
Direct origins are recorded as unverified provenance.

## Updating and removing

```bash
damat module update user --yes
damat module remove user --yes
```

Review usage warnings before removal. The installer removes owned files, but the
backend owner must remove shared config, environment, aliases, imports, links,
and call sites after confirming they are no longer needed.

---

Prev: [← Authoring a module](./13-authoring-modules.md) · [Guide home](../GUIDE.md) · Next: [Publishing modules →](./14b-publishing-modules.md)
