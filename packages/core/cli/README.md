# @damatjs/cli

> A framework-neutral, embeddable TypeScript command runtime with declarative commands, validation, help, and optional presentation.

`@damatjs/cli` turns a `CliDefinition` into one isolated command invocation. The
caller may inject arguments, cwd, environment, structured logging, and text
output. Each run owns its registry and, when requested, its project-config
cache. It returns a result instead of terminating the host process.

Part of the [Damat](../../../README.md) monorepo · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/cli
```

The package depends only on `cac`. It does not depend on Damat framework,
logger, environment, or process-lifecycle packages.

## Quick start

```ts
import { runCli } from "@damatjs/cli";

const result = await runCli({
  name: "my-cli",
  version: "1.0.0",
  commands: [
    {
      name: "hello",
      description: "Say hello",
      options: [{ name: "name", alias: "n", type: "string", default: "World" }],
      handler: async (ctx) => {
        ctx.logger.info(`Hello, ${String(ctx.options.name)}!`);
        return { exitCode: 0 };
      },
    },
  ],
});

process.exitCode = result.exitCode;
```

`runCli` uses process-backed defaults only when an override is absent. An
embedded host can supply a complete runtime:

```ts
const result = await runCli(definition, {
  args: ["build", "--target", "server"],
  cwd: "/workspace",
  env: { MODE: "test" },
  logger: myLogger,
  output: { write: (message = "") => messages.push(message) },
});
```

## Runtime and results

```ts
interface CliRuntime {
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
  logger: CliLogger;
  output: CliOutput;
}

interface CliRunResult {
  exitCode: number;
  command?: string;
}
```

`createRuntime(overrides)` fills omitted values from `process` and
dependency-free console adapters. `runCli(definition, runtime)` always resolves to a
`CliRunResult` for normal command, help, validation, configuration, and handler
outcomes. Setup errors such as a missing definition name still reject.

## Presentation policy

Help and banner text use `CliOutput`; leveled messages use `CliLogger`.
Presentation is opt-in:

- A banner renders only when `banner` is an object.
- The global verbose option exists only when `verbose.enabled === true`.
- Enabled global options are consumed before command routing, so both
  `my-cli --verbose parent child` and `my-cli parent child --verbose` pass
  `ctx.options.verbose === true` to the resolved handler.
- Error detail depends on an explicit `verbose` value, not an environment name.

```ts
const definition = {
  name: "my-cli",
  version: "1.0.0",
  banner: { style: "boxed", title: "My CLI" },
  verbose: { enabled: true },
  commands,
};
```

## Invocation-local state

`createCommandRegistry()` returns a new registry. `runCli` creates one per call,
so concurrent invocations cannot share commands or aliases.

`defineCliCapability({ name, commands })` gives command packages a shared
contract. `composeCliCapabilities(capabilities)` flattens their commands in the
provided order. Package tests can import `runCapabilityTest` from
`@damatjs/cli/testing` to execute a capability with in-memory runtime I/O.

Project configuration is opt-in through `definition.configLoader`. Without a
loader, `runCli` creates no config accessor and handlers receive no
`ctx.options.config`. `loadConfig(loader, cwd)` and `withConfig(loader, cwd)`
remain available to consumers that need direct project-config loading.

## Main exports

| Export                                                        | Purpose                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| `runCli(definition, runtime?)`                                | Parse and dispatch one invocation; return `CliRunResult`. |
| `createRuntime(overrides?)`                                   | Fill a neutral runtime with process-backed defaults.      |
| `createCommandRegistry()`                                     | Create an isolated command registry.                      |
| `defineCliCapability(value)`                                  | Define an independently composable command package.       |
| `composeCliCapabilities(values)`                              | Flatten capability commands in order.                     |
| `loadConfig(loader, cwd)`                                     | Load one project configuration value.                     |
| `withConfig(loader, cwd)`                                     | Create an accessor-local config cache.                    |
| `executeCommand(...)`                                         | Run the shared validation/config/handler pipeline.        |
| `printDefaultHelp`, `printCommandSpecificHelp`, `printBanner` | Write presentation through `CliOutput`.                   |
| `reportError`, `getExitCode`                                  | Render explicit diagnostics and map errors to results.    |

Types include `CliDefinition`, `CliRuntime`, `CliRunResult`, `CliLogger`, `CliOutput`,
`Command`, `CommandContext`, `CommandOption`, and `CommandRegistry`.

## Executable ownership

Executable packages own their process policy. The Damat executable creates its
runtime in `packages/cli/damat/src/runtime.ts`, explicitly enables Damat's banner
and verbose behavior, awaits `runCli`, and assigns `process.exitCode`.

## Documentation

- [Internals](./docs/README.md)
- [Run loop and config](./docs/run.md)
- [Registry](./docs/registry.md)
- [Help and banner](./docs/help.md)
- [Output and validation](./docs/output-and-validation.md)
- [Command model](./docs/command-model.md)

## License

MIT
