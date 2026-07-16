# @damatjs/cli-kit

Framework-neutral installation for any project through the universal
`damat.json` profile. Providers declare named source capabilities; receivers
declare where those capabilities belong. A receiver manifest is optional when
the provider supplies safe fallbacks or the caller passes `--target` overrides.

```ts
import { kitCliCapability } from "@damatjs/cli-kit";
```

The capability provides `kit init`, `validate`, `plan`, `add`, `list`, `update`,
and `remove`. Local paths, directories, Git, registry refs, npm artifacts, and
tarballs all use the same transactional installer and `damat.lock.json`.

Source mode is stable and editable. Node and Damat package backends require
`--experimental-package` and are early alpha. Legacy `damat-kit.json` remains a
read fallback; new kits write only `damat.json`.

- [Internals](./docs/README.md)
