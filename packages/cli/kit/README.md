# @damatjs/cli-kit

Framework-neutral, shadcn-style source installation for any project. A kit
declares placement rules in `damat-kit.json`; consumers can validate, preview,
and copy its editable files from a local directory or Git source.

```ts
import { kitCliCapability } from "@damatjs/cli-kit";
```

The capability provides `kit init`, `kit validate`, and `kit add`. Package
installation is optional and rejects unsafe specifications before file writes.

- [Internals](./docs/README.md)
