# @damatjs/module-generator internals

`@damatjs/module-generator` owns the Damat-specific, filesystem-writing half of
code generation. Pure schema rendering remains in `@damatjs/schema-codegen`.

## Source map

| Directory       | Responsibility                                                       |
| --------------- | -------------------------------------------------------------------- |
| `src/run/`      | Model discovery, schema generation, output writes, and orchestration |
| `src/scaffold/` | Scaffold-once CRUD files, import paths, naming, and templates        |
| `src/registry/` | App and package registry renderers plus service-name discovery       |
| `src/barrel/`   | Sorted recursive workflow barrels                                    |

## Generation flow

1. `runCodegen` optionally discovers model definitions and builds a schema.
2. `runModuleCodegen` asks `@damatjs/schema-codegen` for a deterministic file map.
3. The map may be augmented before generated type files are overwritten.
4. Registry output is regenerated with the type files.
5. CRUD steps, workflows, and routes are written only when absent.
6. Workflow barrels are rebuilt depth-first with stable sorted exports.

`@damatjs/cli-codegen` supplies app configuration, link augmentation, and
command reporting around this flow. `@damatjs/module` calls the same owner for
standalone module tooling.

## Invariants

- Existing scaffold files are never overwritten.
- Generated schema files and registries are regenerated on every run.
- Each table creates five steps, five workflows, five collection-route files,
  and four id-route files.
- Alias mode keeps generated imports portable between standalone modules and
  installed backends.
- Barrel output is deterministic and always reflects the current directory.
- Scaffold and barrel failures are reported as warnings after generated types
  and the registry have been written.
- App-owned registries use service imports; immutable package registries derive
  the service type from the resolved module entry.
