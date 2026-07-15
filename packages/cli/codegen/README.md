# @damatjs/cli-codegen

The Damat application codegen capability. It exports the `codegen` and `barrel`
commands in their compatible order.

```ts
import { codegenCliCapability, codegenCommands } from "@damatjs/cli-codegen";
```

`codegen` loads application modules, generates types and CRUD scaffolds for one
module or all eligible modules, and augments generated types with cross-module
link fields. `barrel` regenerates workflow barrel files.

See [internals](./docs/README.md).
