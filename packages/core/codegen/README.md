# @damatjs/codegen

Compatibility facade for Damat code generation.

The package re-exports the public APIs of:

- [`@damatjs/schema-codegen`](../schema-codegen/README.md) for pure
  `ModuleSchema` to TypeScript/Zod source generation.
- [`@damatjs/module-generator`](../../module-generator/README.md) for model
  discovery, filesystem output, registries, CRUD scaffolds, and barrels.

It contains no generation implementation and produces no runtime warning or
import side effect. Existing applications can keep their current imports, while
new code should import the package that owns the behavior it uses.

## Owner packages

Use `@damatjs/schema-codegen` when the input is a serialized `ModuleSchema` and
the output is a source string or deterministic `Map<string, string>`.

```ts
import { generateFilesMap, generateTypes } from "@damatjs/schema-codegen";
```

Use `@damatjs/module-generator` when generation needs Damat model discovery,
output paths, registries, CRUD scaffolds, or workflow barrels.

```ts
import { generateBarrels, runModuleCodegen } from "@damatjs/module-generator";
```

The root export and `@damatjs/codegen/types` subpath preserve the combined
compatibility surface.

See the [facade internals](./docs/README.md) and the
[Damat guide](../../../docs/GUIDE.md).

## License

MIT
