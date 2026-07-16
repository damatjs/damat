# @damatjs/cli-codegen

The Damat application codegen capability. It exports the `codegen` and `barrel`
commands in their compatible order.

```ts
import { codegenCliCapability, codegenCommands } from "@damatjs/cli-codegen";
```

`codegen` loads application modules, generates types and CRUD scaffolds for one
module or all eligible modules, and augments generated types with cross-module
link fields. Source output stays in the editable module. Immutable packages are
inspected through their resolved entry/models while generated types remain
app-owned under `src/modules/<id>/types`. Declared model directories may contain
an aggregate index or individual model files. Package registry types derive the
service from the resolved default module entry and require no package-root
exports. `barrel` regenerates workflow barrels.

See [internals](./docs/README.md).
