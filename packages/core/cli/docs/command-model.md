# Command and runtime model

All public types are exported from `@damatjs/cli`.

## `CliCapability`

```ts
interface CliCapability {
  name: string;
  commands: readonly Command[];
}
```

`defineCliCapability` preserves the concrete capability type.
`composeCliCapabilities` returns commands in capability and command order. Use
`runCapabilityTest` from `@damatjs/cli/testing` to run one capability with
captured output and logs.

## `CliDefinition`

```ts
interface CliDefinition {
  name: string;
  version: string;
  description?: string;
  commands: Command[];
  defaultCommand?: string;
  banner?: BannerConfig | false;
  helpTemplate?: HelpTemplateFn;
  verbose?: VerboseConfig;
  configLoader?: ConfigLoader;
  onError?: ErrorHandlerFn;
}
```

`CliDefinition` describes the executable; it is not a project configuration
file. `banner`, `verbose`, and `configLoader` are opt-in policies. Without a
`configLoader`, the run loop creates no project-config accessor. `helpTemplate`
remains part of the definition; the built-in run loop renders the standard help
writers.

## `Command`

```ts
interface Command {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  examples?: string[];
  options?: CommandOption[];
  subcommands?: Command[];
  handler(ctx: CommandContext): Promise<CommandResult>;
}
```

Subcommands are namespaced in the invocation registry. Both subcommands and leaf
commands use the shared execution pipeline.

## `CommandContext`

```ts
interface CommandContext {
  command: string;
  args: string[];
  options: Record<string, unknown>;
  logger: CliLogger;
  cwd: string;
}
```

`args`, `cwd`, and `logger` come from the current runtime. When the optional
project-config loader returns a non-null value it is available at
`options.config`; otherwise that property is absent.

## Runtime I/O

```ts
interface CliRuntime {
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
  logger: CliLogger;
  output: CliOutput;
}

interface CliOutput {
  write(message?: string): void;
}
```

`CliLogger` is a structural interface for debug, info, success, skip, warn, and
error messages. Hosts may supply any compatible logger without adding it as a
core dependency.

## Results

Handlers return `{ exitCode }`. `runCli` returns:

```ts
interface CliRunResult {
  exitCode: number;
  command?: string;
}
```

The optional command identifies the resolved or failed command. Help/version
results do not require one.

## Options

`CommandOption` supports a long name, optional alias, description, type,
default, and required marker. Supported coercion types are `string`, `number`,
and `boolean`; `--no-<name>` negates known boolean options.
