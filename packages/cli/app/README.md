# @damatjs/cli-app

Application lifecycle commands for Damat-compatible backends. The capability
can run by itself or be composed into another CLI without importing the
`damat` executable.

```ts
import { composeCliCapabilities, runCli } from "@damatjs/cli";
import { appCliCapability } from "@damatjs/cli-app";

await runCli({
  name: "backend",
  version: "1.0.0",
  commands: composeCliCapabilities(appCliCapability),
});
```

It provides `create`, `clone`, `dev`, `start`, and `build`. Configuration is
optional: commands only read `damat.config.ts` when the operation needs it.

- [Internals](./docs/README.md)
- [CLI framework](../../core/cli/README.md)
