# @damatjs/cli-module

Standalone capabilities for authoring and installing Damat modules, plus the
current auth-storage scaffold.

```ts
import { authCliCapability, moduleCliCapability } from "@damatjs/cli-module";
```

`module plan/add/list/update/remove` use the same transactional engine as Kit
and accept registry refs, paths, directories, Git, npm, and tarballs. Source is
stable and editable. Node and Damat package storage are explicit early-alpha
modes requiring `--experimental-package`.

The installer owns only files it adds. It never edits `damat.config.ts`,
`tsconfig.json`, `.env*`, barrels, or call sites; commands report that work for
the user or AI. Existing `module.json` files remain readable, while new module
scaffolds write root `damat.json`. npm-shaped `module publish` is removed.

The package also owns module init/dev/build/validation, migrations, codegen,
and the embedded authoring guide.

See [internals](./docs/README.md) and the [manifest contract](../../module/MODULES.md).
