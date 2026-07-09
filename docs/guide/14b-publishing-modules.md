[Damat Guide](../GUIDE.md) › Publishing modules

# 14b. Publishing modules & running a registry

You've [authored a module](./13-authoring-modules.md) and others can already
install it straight from git. This chapter covers the next step: listing it in
a registry so it installs by name, with an owner and a verification status.

## What a registry is

A registry is just a JSON index mapping module refs to sources. The CLI and
the [MCP server](./15-installing-modules-with-ai.md) read it from
`DAMAT_MODULE_REGISTRY`, which accepts:

- a URL — e.g. `https://registry.damatjs.com/index.json`
- a local path to a `registry.json`
- a directory containing one

## The index format

```json
{
  "modules": {
    "damatjs/user": {
      "source": "https://github.com/damatjs/modules.git#main",
      "description": "Authentication, sessions and accounts.",
      "latest": "0.2.0",
      "versions": {
        "0.1.0": "https://github.com/damatjs/modules.git#user-v0.1.0",
        "0.2.0": { "source": "https://github.com/damatjs/modules.git#user-v0.2.0" }
      },
      "owner": { "namespace": "damatjs", "verified": true },
      "verification": { "status": "verified", "verifiedBy": "registry.damatjs.com" },
      "keywords": ["auth", "users", "sessions"],
      "license": "MIT",
      "repository": "https://github.com/damatjs/modules"
    }
  }
}
```

Entry keys are `namespace/name` (or a bare `name`). Each version maps to a git
source — usually a tag per release (`#user-v0.2.0`), so published versions are
immutable while `latest` advances.

## Publishing a version

1. Validate and build the module: `damat module validate && damat module build`.
2. Tag the release in your module's repo (e.g. `billing-v0.1.0`).
3. Add or update the entry in the registry index: bump `latest`, add the
   version → tag mapping.

For the public registry at
[registry.damatjs.com](https://registry.damatjs.com), the index lives in the
[`damatjs/damat`](https://github.com/damatjs/damat) monorepo at
`apps/registry/data/registry.json` — open a pull request that adds your entry.
New entries start as `"verification": { "status": "unverified" }`; the registry
operators review and mark entries `verified`.

## Verification statuses

| Status | Meaning | Install behavior |
|--------|---------|------------------|
| `verified` | Reviewed; source pinned by the registry | installs cleanly |
| `unverified` | Listed, not reviewed | subject to your policy |
| `pending` | Review in progress | subject to your policy |
| `rejected` / `revoked` | Blocked by the registry | **always refused** |

The consumer-side policy is `DAMAT_MODULE_VERIFY`:

- `off` — install anything the registry serves
- `warn` *(default)* — install, but print what you're trusting
- `require` — only `verified` entries install

Path and git sources bypass the registry entirely and require
`--allow-unverified` — you pointed at them, so you own the trust decision.

## Running your own registry

Nothing about the index is special to damatjs.com — host the JSON anywhere
(static file server, S3, your own app) and point `DAMAT_MODULE_REGISTRY` at
it. A private registry for your organization is a single static file:

```bash
export DAMAT_MODULE_REGISTRY=https://modules.internal.acme.dev/index.json
damat module add acme/billing
```

---

Prev: [← Installing existing modules](./14-installing-modules.md) · [Guide home](../GUIDE.md) · Next: [Installing modules with AI →](./15-installing-modules-with-ai.md)
