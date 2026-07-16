# Damat modules — the `damat.json` contract

A module is a self-contained backend capability. Its root `damat.json` uses the
same bidirectional installation schema as applications and kits. In a source
artifact, `install.provides` declares named file capabilities. In a receiving
backend, `install.accepts` declares their destinations.

```json
{
  "$schema": "https://damat.dev/schemas/damat-v1.json",
  "schemaVersion": 1,
  "kind": "module",
  "name": "user",
  "version": "1.0.0",
  "install": {
    "modes": ["source", "package"],
    "default": "source",
    "packageBackends": ["node", "damat"],
    "provides": {
      "module": { "from": "src/**", "fallbackTo": "src/modules/{id}" },
      "routes": {
        "from": "src/api/routes/**",
        "fallbackTo": "src/modules/{id}/api/routes"
      }
    },
    "packages": { "zod": "^4" },
    "usageHints": [{ "token": "user" }],
    "instructions": {
      "add": ["Add user to damat.config.ts."],
      "remove": ["Remove user from damat.config.ts after reviewing usage."]
    }
  },
  "module": {
    "description": "Users and sessions",
    "entry": "./src/index.ts",
    "models": "./src/models",
    "migrations": "./src/migrations",
    "routes": "./src/api/routes",
    "workflows": "./src/workflows",
    "jobs": "./src/jobs",
    "events": "./src/events",
    "pipelines": "./src/pipelines",
    "links": "./src/links",
    "tests": "./tests",
    "types": "./src/types",
    "env": [{ "name": "USER_SECRET", "required": true }],
    "pairsWith": ["organization"],
    "registry": { "namespace": "damatjs", "license": "MIT" }
  }
}
```

## Installation rules

Destination selection is CLI `--target capability=path`, then the receiver's
matching accept, then the provider's `fallbackTo`. `{id}` is the only template.
All paths must remain relative and may not contain parent traversal or
backslashes.

Source mode is stable and produces editable, checksum-owned files. The
installer records provenance and ownership in `damat.lock.json`, backs up only
modified owned files when confirmed, and warns about usage before removal.

The installer does not edit `damat.config.ts`, `tsconfig.json`, `.env*`, route
or workflow barrels, or application call sites. Manifest instructions and
usage hints report that user/AI-owned work.

Node and Damat package backends are early alpha and require
`--experimental-package`. Node delegates to the target package manager. Damat
stores self-contained immutable artifacts in `.damat/packages`; external
runtime dependencies are rejected.

## Runtime metadata

The `module` object may declare `entry`, `models`, `migrations`, `routes`,
`workflows`, `jobs`, `events`, `pipelines`, `links`, `tests`, generated `types`,
environment declarations, module dependencies, pairing hints, author,
description, and registry metadata. `@damatjs/module` normalizes this object to
the existing `ModuleManifest` API.

Legacy `module.json` is a read-only compatibility fallback during the 0.x
migration window. New scaffolds write only root `damat.json`. Legacy fields map
as follows: identity stays top-level; `packages` moves to `install.packages`;
`paths`, `env`, `modules`, `pairsWith`, author, description, and registry data
move under `module`.

## Commands

```bash
damat module init user
damat module validate
damat module plan ./user
damat module add ./user
damat module list
damat module update user
damat module remove user
```

Registry refs use `DAMAT_REGISTRY` or the compatibility
`DAMAT_MODULE_REGISTRY`. Git-hosted automation will own publication; the CLI
does not provide an npm-shaped publish command.
