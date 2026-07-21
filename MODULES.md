# The `damat.json` contract

`damat.json` is the portable contract shared by Damat applications, modules,
kits, and packages. It describes artifact identity, install capabilities,
runtime locations, integration guidance, and registry metadata without running
manifest-authored code.

The manifest schema is strict. Unknown fields are rejected so a misspelled
capability cannot silently install to the wrong place.

## Universal envelope

```jsonc
{
  "$schema": "https://damat.dev/schemas/damat-v1.json",
  "schemaVersion": 1,
  "kind": "module",
  "name": "billing",
  "version": "1.0.0",
  "install": {},
  "module": {},
}
```

| Field           | Required    | Meaning                                      |
| --------------- | ----------- | -------------------------------------------- |
| `$schema`       | no          | Editor/schema discovery URL                  |
| `schemaVersion` | yes         | Contract schema; currently `1`               |
| `kind`          | yes         | `application`, `module`, `kit`, or `package` |
| `name`          | yes         | Stable kebab-case artifact identity          |
| `version`       | no          | Artifact version                             |
| `install`       | no          | Capability and installation profile          |
| `module`        | module only | Module runtime paths and metadata            |

## Install profile

An artifact declares what it provides. A receiver declares where it accepts
those capabilities.

```jsonc
{
  "install": {
    "modes": ["source", "package"],
    "default": "source",
    "packageBackends": ["node", "damat"],
    "provides": {
      "module": { "from": "src/**", "fallbackTo": "src/modules/{id}" },
      "routes": {
        "from": "src/api/routes/**",
        "fallbackTo": "src/api/routes/{id}",
      },
      "jobs": { "from": "src/jobs/**", "fallbackTo": "src/jobs/{id}" },
      "events": {
        "from": "src/events/**",
        "fallbackTo": "src/events/{id}",
      },
      "pipelines": {
        "from": "src/pipelines/**",
        "fallbackTo": "src/pipelines/{id}",
      },
    },
    "packages": { "provider-sdk": "^2.0.0" },
    "usageHints": [{ "token": "billing" }],
    "instructions": {
      "add": ["Register billing in damat.config.ts."],
      "remove": ["Remove billing integration call sites."],
    },
  },
}
```

### Provider fields

| Field             | Meaning                                          |
| ----------------- | ------------------------------------------------ |
| `modes`           | Supported `source` and/or `package` installation |
| `default`         | Default mode when the CLI has no override        |
| `packageBackends` | Supported `node` and/or Damat package stores     |
| `provides`        | Named capability to source-pattern mappings      |
| `packages`        | External package requirements                    |
| `ignore`          | Paths excluded from the installation recipe      |
| `usageHints`      | Tokens/targets scanned before removal            |
| `instructions`    | Advisory add/remove integration work             |

### Receiver fields

Applications normally declare `install.accepts`:

```jsonc
{
  "schemaVersion": 1,
  "kind": "application",
  "name": "my-api",
  "install": {
    "accepts": {
      "module": { "to": "src/modules/{id}" },
      "routes": { "to": "src/api/routes/{id}" },
      "workflows": { "to": "src/workflows/{id}" },
      "jobs": { "to": "src/jobs/{id}" },
      "events": { "to": "src/events/{id}" },
      "pipelines": { "to": "src/pipelines/{id}" },
      "links": { "to": "src/links/{id}" },
      "tests": { "to": "tests/modules/{id}" },
    },
  },
}
```

Destination precedence is an explicit CLI `--target`, receiver `accepts`,
provider `fallbackTo`, then a planning error. `{id}` is replaced by the
installation identity.

## Module metadata

The `module` object may declare:

| Field                           | Meaning                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `description`, `author`         | Human ownership and purpose                                      |
| `entry`                         | Runtime entry override; convention discovery is used when absent |
| `models`, `migrations`, `types` | Data/schema locations                                            |
| `routes`, `workflows`           | HTTP and in-process saga providers                               |
| `jobs`, `events`, `pipelines`   | Durable capability providers                                     |
| `links`, `tests`                | Dormant link templates and tests                                 |
| `env`                           | Declared environment requirements                                |
| `modules`                       | Hard module dependencies; use sparingly                          |
| `pairsWith`                     | Non-binding composition hints                                    |
| `registry`                      | Namespace, license, keywords, repository, and homepage           |

Example:

```jsonc
{
  "$schema": "https://damat.dev/schemas/damat-v1.json",
  "schemaVersion": 1,
  "kind": "module",
  "name": "billing",
  "version": "1.0.0",
  "install": {
    "modes": ["source"],
    "default": "source",
    "provides": {
      "module": { "from": "src/**", "fallbackTo": "src/modules/{id}" },
      "routes": {
        "from": "src/api/routes/**",
        "fallbackTo": "src/api/routes/{id}",
      },
      "jobs": { "from": "src/jobs/**", "fallbackTo": "src/jobs/{id}" },
    },
    "usageHints": [{ "token": "billing" }],
  },
  "module": {
    "description": "Invoices, payments, and refunds.",
    "models": "./src/models",
    "migrations": "./src/migrations",
    "routes": "./src/api/routes",
    "jobs": "./src/jobs",
    "env": [
      {
        "name": "BILLING_API_KEY",
        "required": true,
        "description": "Provider API key",
      },
    ],
    "pairsWith": ["user"],
    "registry": {
      "namespace": "acme",
      "license": "MIT",
      "keywords": ["billing", "payments"],
    },
  },
}
```

## Capability ownership

A source module may provide models, migrations, routes, workflows, jobs,
events, pipelines, links, tests, and types. Installation copies owned files and
records checksums/provenance in `damat.lock.json`.

The installer deliberately does not edit shared application policy:

- `damat.config.ts`
- TypeScript aliases
- `.env` and `.env.example`
- shared barrels
- application call sites
- authentication or operational routes

The provider's instructions and the installation report tell the backend owner
what remains. The owner reviews those notices, wires the module, runs
`bun run db:migrate`, and restarts the application.

## Module isolation

A reusable module owns only its own tables and migrations. It must not create a
foreign key to another module's table or import another module's implementation.
Use `pairsWith` for a suggestion. A module may ship a dormant link template;
the backend owner chooses whether to activate it with a link migration.

Standalone `bun run database:setup` creates the module development database and
applies only that module's migrations. Shared durability, jobs, events, and
pipeline catalogs are installed by the assembled backend.

## Source and package installation

Source mode installs editable capability files and is the normal development
and composition path. Package mode resolves an immutable Node or Damat package
artifact and requires the explicit package-mode CLI gate. Both modes use the
same manifest identity and capability model.

Always inspect a plan before installing an unfamiliar artifact:

```bash
damat module plan <ref|path|git-url>
damat module add <ref|path|git-url>
```

## Registry trust

The author declares descriptive metadata; the registry assigns owner and
verification state. An artifact cannot verify itself. Registry policy may be
`off`, `warn`, or `require`, but rejected and revoked artifacts are always
blocked.

Use `DAMAT_REGISTRY` (or the module-registry compatibility variable) to select
the registry index. Direct paths and Git origins remain recorded as unverified
provenance.

## Validation

```bash
damat module validate
```

Errors block installation. Warnings identify publishing-readiness gaps such as
missing version, description, author, license, namespace, or migrations for
declared models. A registry-ready module has neither errors nor warnings.

Implementation details live in
[`@damatjs/module`](./packages/module/README.md), its
[manifest internals](./packages/module/docs/manifest.md), and the
[installer](./packages/installer/README.md).
