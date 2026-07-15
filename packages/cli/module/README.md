# @damatjs/cli-module

Standalone CLI capabilities for authoring, installing, inspecting, updating,
and removing Damat modules, plus the current auth-storage scaffold.

```ts
import { authCliCapability, moduleCliCapability } from "@damatjs/cli-module";
```

`module add` accepts registry references, local paths, directories, Git URLs,
and GitHub shorthand. Registry sources pass the registry verification policy;
local and Git sources require the explicit unverified-source policy. Installed
source is copied into the application and its provenance is recorded.

The package also owns module init/dev/build/validation, migrations, codegen,
publish compatibility, and the embedded module-authoring guide.

See [internals](./docs/README.md) and the repository [module contract](../../../MODULES.md).
