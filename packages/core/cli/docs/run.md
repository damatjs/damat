# Run loop, parsing, context, and config

## `runCli`

```ts
async function runCli(
  definition: CliDefinition,
  runtime?: Partial<CliRuntime>,
): Promise<CliRunResult>;
```

The run loop validates the CLI definition, creates runtime defaults, constructs
an isolated registry, configures CAC, applies presentation policy, dispatches
one command, and returns its result. It creates a project-config accessor only
when `definition.configLoader` is present.

Normal outcomes never terminate the process:

- help and version return `{ exitCode: 0 }`;
- unknown commands return `{ exitCode: 1, command }`;
- handlers return their exit code with the resolved command name;
- validation, config, and handler errors are mapped to result codes.

An executable decides whether to assign `process.exitCode`, throw, retry, or
continue doing other work.

## Runtime defaults

`createRuntime(overrides)` fills only omitted values:

- `args` from `process.argv.slice(2)`;
- `cwd` from `process.cwd()`;
- `env` from `process.env`;
- logger and output from dependency-free console adapters.

The rest of core reads the resulting runtime rather than reading process state.

## Routing

Leaf commands are registered with CAC. `runCli` parses
`["bun", definition.name, ...runtime.args]` with `{ run: false }`, then awaits
`runMatchedCommand()` so the action result is observable.

Default commands and `<parent> <child>` invocations are resolved through
`dispatchManual`. They use `parseCommandArgs` and then enter the same
`runCommand`/`executeCommand` pipeline as CAC leaf commands.

## Shared execution pipeline

When a project-config accessor exists, `runCommand` loads it and maps failures
to a result without invoking the handler. Without one, command execution
continues directly with no `ctx.options.config` property.

`executeCommand`:

1. coerces options;
2. applies defaults;
3. builds context from explicit args, cwd, and logger;
4. validates required options;
5. injects non-null project config as `ctx.options.config`;
6. applies explicit verbose behavior;
7. awaits the handler;
8. calls `onError` and maps thrown values when necessary.

## Command context

```ts
buildCommandContext(commandName, rawArgs, options, {
  cwd: runtime.cwd,
  logger: runtime.logger,
});
```

`buildCommandContext` does not read `process.argv` or `process.cwd()`. Positional
arguments are derived from the explicit command argument list.

## Config loading

```ts
await loadConfig(loader, cwd);
const projectConfig = withConfig(loader, cwd);
await projectConfig.get();
projectConfig.clear();
```

`loadConfig` performs one file lookup/load operation. Relative candidates are
resolved against the required cwd. Custom loaders receive the resolved path;
otherwise the file is imported and a function export is awaited.

`withConfig` owns a boolean loaded sentinel and cached value. It caches objects,
primitive values, and `null`; clearing one accessor does not affect any other
invocation. `runCli` does not call it when `configLoader` is omitted.
