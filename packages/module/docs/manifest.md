# The `damat.json` module contract

Source: `src/manifest/`, plus the universal schema in `@damatjs/installer`.

New modules use a root `damat.json`. During the 0.x migration window,
`readModuleManifest` also accepts the legacy `module.json` contract. New
scaffolds never write the legacy file.

The author-facing reference is [MODULES.md](../MODULES.md).

## Universal envelope

```ts
interface DamatManifest {
  $schema?: string;
  schemaVersion: 1;
  kind: "module";
  name: string;
  version?: string;
  install?: DamatInstallProfile;
  module?: Record<string, unknown>;
}
```

The parser is strict: unknown top-level, install, capability, and module keys
are rejected. Executable manifest fields are not supported.

## Install profile

The optional `install` object declares:

- `modes`: supported `source` and/or `package` modes.
- `default`: the manifest default. New module scaffolds choose `source`.
- `packageBackends`: supported `node` and/or `damat` package stores.
- `provides`: named capability paths supplied by the artifact.
- `packages`: external package requirements.
- `usageHints`: tokens and likely host locations used for removal warnings.
- `instructions`: advisory add/remove integration steps.

Mode precedence is CLI override, then manifest default, then `source`.
Package mode and both package backends are experimental; source mode is the
stable path.

## Module metadata

The `module` object accepts `entry`, `models`, `migrations`, `routes`,
`workflows`, `jobs`, `events`, `pipelines`, `links`, `tests`, `types`, `env`,
`modules`, `pairsWith`, `author`, `registry`, and `description`.

`readModuleManifest` normalizes these fields into the runtime-facing
`ModuleManifest`. Install packages come from `install.packages`.

`entry` is optional. `resolveModuleEntry` first honours a declared override,
then checks `index.ts`, `index.js`, `src/index.ts`, and `src/index.js`. This
keeps existing `src/module.json` modules using `"./index.ts"` compatible while
allowing new root `damat.json` modules to omit redundant metadata.

## Reading

`readModuleManifest(moduleDir)` uses this order:

1. `<moduleDir>/damat.json`.
2. `<moduleDir>/module.json` as a legacy fallback.
3. A clear error if neither exists.

`locateModuleDir` checks the package root and `src/` for either filename, so
existing 0.x module packages continue to boot and validate.

## Ownership boundary

The manifest describes files and advisory integration. Installing or removing a
module does not edit shared host config, barrels, env files, or call sites. The
CLI reports the relevant locations; the user or AI owns those edits and cleanup.
