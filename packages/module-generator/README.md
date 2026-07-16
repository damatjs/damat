# @damatjs/module-generator

Damat-specific model discovery, schema output, CRUD scaffolding, registry
rendering, and deterministic workflow barrels.

The package consumes `generateFilesMap` from
[`@damatjs/schema-codegen`](../core/schema-codegen/README.md), writes generated
type and Zod files, and scaffolds the route → workflow → step layer expected by
a Damat module. Scaffold files are created once: regeneration skips existing
files so user edits survive.

## Install

```bash
bun add @damatjs/module-generator
```

## Run generation

```ts
import { runModuleCodegen } from "@damatjs/module-generator";

const result = await runModuleCodegen({
  schema,
  moduleId: "shop",
  typesDir: "./src/types",
  serviceDir: "./src",
  routesRoot: "./src/api/routes",
  workflowsRoot: "./src/workflows",
});
```

Use `runCodegen` when the package should discover models from a module resolver
before generating. Both entry points return the output directory, regenerated
type files, and newly scaffolded files.

## API

- `runModuleCodegen` generates from an existing `ModuleSchema`.
- `runCodegen` discovers models, converts them to a schema, then generates.
- `generateCrudScaffold` creates CRUD steps, workflows, and split routes once.
- `generateBarrels` rebuilds sorted, deterministic recursive barrels.
- `registryAugmentation` renders app-owned service registry declarations.
- `registryModuleAugmentation` renders immutable package registry declarations.

See [the internals guide](./docs/README.md) for ownership and filesystem
invariants.

## License

MIT
