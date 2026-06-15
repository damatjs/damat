# Command model — types

Covers `src/types/` (`cli.ts`, `command.ts`, `commandOption.ts`, `commandRegistry.ts`, `parsedCommand.ts`, `banner.ts`) — all re-exported via `src/types/index.ts` and then `src/index.ts`.

These interfaces are the contract between a CLI author and the framework. Everything else (registry, run loop, help, validation) operates on them.

## `CliConfig` — `cli.ts`

The single object passed to `runCli`.

```ts
interface CliConfig {
  name: string;                      // required — used as the cac program name
  version: string;                   // required
  description?: string;              // shown in help/banner
  commands: Command[];               // required — top-level commands
  banner?: BannerConfig | false;     // false disables; absent → boxed default
  helpTemplate?: HelpTemplateFn;     // accepted but NOT wired into runCli today
  verbose?: VerboseConfig;           // --verbose behavior
  configLoader?: ConfigLoader;       // optional project-config file loading
  onError?: ErrorHandlerFn;          // called when a leaf handler throws
}

type HelpTemplateFn = (config: CliConfig, commands: Command[]) => string;
type ErrorHandlerFn = (error: Error, ctx: CommandContext | Partial<CommandContext>) => void;

interface VerboseConfig { enabled?: boolean; handler?: "auto" | "manual"; }
interface ConfigLoader { file?: string | string[]; load?: (filePath: string) => Promise<unknown>; }
```

Notes:
- `runCli` throws plain `Error`s if `name` or `version` is missing (before anything else runs).
- `verbose.enabled` defaults to **on** — the `--verbose` global flag is registered unless `verbose.enabled === false`.
- `helpTemplate` is currently inert (see [help.md](./help.md)); `printDefaultHelp` is always used.

## `Command` — `command.ts`

```ts
interface Command {
  name: string;                 // required
  description: string;          // required
  aliases?: string[];           // alternate invocation names
  usage?: string;               // overrides "Usage: <cli> <name> [options]" in help
  examples?: string[];          // shown under "Examples:" in per-command help
  options?: CommandOption[];
  subcommands?: Command[];      // nested commands (see registry.md)
  handler: (ctx: CommandContext) => Promise<CommandResult>;
}

interface CommandResult { exitCode: number; }
```

A command must have a `handler`, even a parent that only groups subcommands (parents are not registered with cac, but the type still requires it). Subcommand `name`s are conventionally written `parent:child` (e.g. `migrate:up`) — the registry handles both prefixed and bare forms.

## `CommandOption` — `commandOption.ts`

```ts
interface CommandOption {
  name: string;                                  // long flag (--name)
  alias?: string;                                // short flag (-a)
  description: string;
  type?: "string" | "boolean" | "number";       // drives coercion; default → string-ish
  default?: unknown;
  required?: boolean;                            // enforced on the leaf (cac) path
}
```

`type` controls how raw argv/cac values are coerced (see [output-and-validation.md](./output-and-validation.md)). `required` is checked by `validateOptions`; a `default` satisfies a `required` check.

## `CommandContext` — `command.ts`

Passed to every handler.

```ts
interface CommandContext {
  command: string;                   // resolved command name (e.g. "build" or "migrate:up")
  args: string[];                    // positional arguments
  options: Record<string, unknown>;  // parsed/coerced options (+ injected `config` on leaf path)
  logger: ILogger;                   // @damatjs/logger instance
  cwd: string;                       // process.cwd()
}
```

On the **leaf** path, if a `configLoader` produced a value it is attached as `ctx.options.config`. On the subcommand path it is not (see [run.md](./run.md)).

## `CommandRegistry` — `commandRegistry.ts`

The interface implemented by the singleton registry (see [registry.md](./registry.md)).

```ts
interface CommandRegistry {
  register(command: Command, prefix?: string): void;
  get(name: string): Command | undefined;
  getAll(): Command[];
  has(name: string): boolean;
}
```

## `ParsedCommand` — `parsedCommand.ts`

```ts
interface ParsedCommand { name: string; args: string[]; options: Record<string, unknown>; }
```

A plain shape for "a command plus its parsed inputs". It is exported but not central to the current run loop (which builds a `CommandContext` directly).

## `BannerConfig` — `banner.ts`

```ts
interface BannerConfig { title?: string; subtitle?: string; style?: "boxed" | "minimal" | "none"; }
```

Defaults: `style` → `"boxed"`, `title` → `config.name`, `subtitle` → `config.description`. See [help.md](./help.md).

## Safe extension

- Add new fields as **optional** to preserve backwards compatibility, and export them from the relevant `types/*` file (the `types/index.ts` barrel re-exports the whole folder).
- A new `CommandOption.type` requires a matching branch in `coerceOptionValue` (`utils/validate/coerceOptions.ts`) and in the framework's own `parseCommandArgs` (`run/buildCommand.ts`) — both convert based on `type`.
