# @damatjs/cli-support

Shared Damat-specific helpers used by independent CLI capability packages.
This package owns system Git detection, Bun type-check execution, best-effort
temporary-file cleanup, and safe `bun add` argument construction.
It also owns reusable PostgreSQL creation options, URL validation, and terminal
prompts. Password and full-URL input are not echoed by the interactive prompt.
It also adapts CLI contexts to the headless installer: origin and registry
resolution, command/fetch ports, runtime flags, modes, package backends, and
capability target overrides.

```ts
import {
  invalidPackageSpecs,
  installPackages,
  originFromArgument,
  createInstallerPorts,
  createInstallerRuntime,
  databaseSetupOptions,
  parseGitSource,
  requireGit,
  resolveDatabaseSelection,
  runTypeCheck,
} from "@damatjs/cli-support";
```

Logger inputs use the structural `CliLogger` contract. The package does not
depend on Damat's logger implementation or any capability package.

- [Internals](./docs/README.md)
- [Damat CLI](../damat/README.md)
