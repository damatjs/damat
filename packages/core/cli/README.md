# @damatjs/cli

> The general CLI framework powering Damat's command-line tools: declarative command/subcommand registry, argument & option parsing, validation, help, and banners.

`@damatjs/cli` turns a single declarative config object into a runnable CLI. You describe commands, options, and handlers; it parses `process.argv` (via [cac](https://github.com/cacjs/cac)), validates and coerces options, dispatches to your handler with a typed `CommandContext`, loads optional project config, and renders help and a banner. It is the `core` framework that the user-facing `@damatjs/damat-cli` and `@damatjs/orm-cli` migration CLI are built on.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/cli
```

Inside this monorepo it is a workspace dependency — reference it as `"@damatjs/cli": "*"` in the consuming package's `package.json`.

## When to use

Use it to build a CLI when you want:

- A **declarative** command tree (commands, aliases, subcommands) instead of hand-wiring a parser.
- Typed **option parsing** with `string`/`number`/`boolean` coercion, defaults, and required-option validation.
- Auto-generated **help** (default + per-command) and an optional **banner**.
- Optional **project config loading** (`*.config.ts`/`.json`/custom) injected into your handler.
- Consistent logging via `@damatjs/logger`.

It is **not** the place for non-CLI argument parsing inside a library, and it deliberately omits middleware/hooks, interactive prompts, and shell-completion generation. It also **calls `process.exit`** itself after a command runs — it owns the process lifecycle, so don't embed it inside a long-lived server.

## Quick start

```ts
#!/usr/bin/env bun
// bin.ts
import { runCli } from "@damatjs/cli";

runCli({
  name: "my-cli",
  version: "1.0.0",
  description: "My awesome CLI tool",
  commands: [
    {
      name: "hello",
      description: "Say hello to someone",
      options: [
        { name: "name", alias: "n", type: "string", description: "Name to greet", default: "World" },
        { name: "loud", type: "boolean", description: "Shout the greeting", default: false },
      ],
      handler: async (ctx) => {
        const name = ctx.options.name as string;
        const loud = ctx.options.loud as boolean;
        ctx.logger.info(loud ? `HELLO, ${name.toUpperCase()}!` : `Hello, ${name}!`);
        return { exitCode: 0 };
      },
    },
  ],
});
```

```bash
bun bin.ts hello --name Alice
bun bin.ts hello -n Bob --loud
bun bin.ts hello --help
```

The real `damat` CLI uses the same shape — see `packages/cli/damat/src/cli.ts`.

## API

All exports come from the single entry point `@damatjs/cli` (no subpath exports).

### Entry point

| Export | Kind | Summary |
| --- | --- | --- |
| `runCli(config: CliConfig)` | function | Build, parse, and dispatch the CLI. Calls `process.exit`. |

### Registry

| Export | Kind | Summary |
| --- | --- | --- |
| `getRegistry()` | function | Get the singleton `CommandRegistry`. |
| `registerCommand(cmd)` | function | Register a command (and its subcommands/aliases). |
| `getCommand(name)` | function | Look up a command by name/alias. |
| `getAllCommands()` | function | All registered commands (deduped). |
| `clearRegistry()` | function | Reset the registry (called at the start of `runCli`). |

### Config loading

| Export | Kind | Summary |
| --- | --- | --- |
| `loadConfig<T>(loader?, cwd?)` | function | Load + cache a project config file. |
| `clearConfigCache()` | function | Drop the cached config. |
| `withConfig<T>(loader)` | function | `{ get, clear }` helper around `loadConfig`. |

### Help & output

| Export | Kind | Summary |
| --- | --- | --- |
| `printDefaultHelp(config, commands)` | function | Render the top-level help. |
| `printCommandSpecificHelp(config, cmd)` | function | Render help for one command. |
| `formatCommandLine(cmd)`, `formatOptionLine(opt)`, `formatCommandHelp(...)` | functions | Help-line formatters. |
| `printBanner(config, banner?)` | function | Render boxed/minimal/none banner. |
| `printError`, `printSuccess`, `printInfo`, `printSection` | functions | Logger-backed console output helpers. |

### Validation (also run automatically by `runCli`)

| Export | Kind | Summary |
| --- | --- | --- |
| `validateOptions(options, defs, cmdName)` | function | Throw `MissingRequiredOptionError` for unmet required options. |
| `applyDefaults(options, defs)` | function | Fill in option defaults. |
| `coerceOptions(options, defs)`, `coerceOptionValue(value, type)` | functions | Coerce values to `string`/`number`/`boolean`. |

### Key types

| Export | Kind | Summary |
| --- | --- | --- |
| `CliConfig` | interface | Top-level config (`name`, `version`, `commands`, `banner`, `verbose`, `configLoader`, `onError`, ...). |
| `Command` | interface | `name`, `description`, `aliases?`, `usage?`, `examples?`, `options?`, `subcommands?`, `handler`. |
| `CommandOption` | interface | `name`, `alias?`, `description`, `type?`, `default?`, `required?`. |
| `CommandContext` | interface | `command`, `args`, `options`, `logger`, `cwd` — passed to every handler. |
| `CommandResult` | interface | `{ exitCode: number }` returned by handlers. |
| `CommandRegistry` | interface | `register`/`get`/`getAll`/`has`. |
| `BannerConfig`, `VerboseConfig`, `ConfigLoader`, `HelpTemplateFn`, `ErrorHandlerFn` | types | Config sub-shapes. |

### Errors

| Export | Kind | Summary |
| --- | --- | --- |
| `CliError` | class | Base error with `exitCode` (default `1`). |
| `CommandNotFoundError` | class | Unknown command. |
| `MissingRequiredOptionError` | class | Required option absent. |
| `ConfigLoadError` | class | Config file failed to load. |
| `CommandRegistrationError` | class | Duplicate command/alias on registration. |

## How it fits

**Depends on**

- `cac` — underlying argv parser.
- `dotenv` — declared dependency for env loading by consumers.
- `@damatjs/logger` — `Logger`/`ILogger` for handler logging and output helpers.

**Depended on by (in repo)**

- `@damatjs/damat-cli` (`packages/cli/damat`) — the user-facing `damat` CLI; re-exports this package and defines `dev`/`build`/`start`/`module` commands.
- `@damatjs/orm-cli` (`packages/orm/cli`) — migration/generate commands.

## Documentation

- [Internals (maintainers)](./docs/README.md)
- [Full guide](../../../docs/GUIDE.md)

## License

MIT
