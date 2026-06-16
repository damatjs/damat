# @damatjs/cli — Internals

Maintainer-facing documentation. For usage see the [package README](../README.md). This folder supersedes the old `README.md` (folded into the README) and `DEV.md` (folded here).

`@damatjs/cli` is a thin, declarative layer over [cac](https://github.com/cacjs/cac). You hand `runCli` a `CliConfig`; it builds a cac instance, mirrors your commands into a singleton registry, parses argv, validates/coerces options, and dispatches to your handler with a typed `CommandContext`. The package owns the process lifecycle (it calls `process.exit`).

## Module map

| File / dir | Responsibility | Detail doc |
| --- | --- | --- |
| `src/index.ts` | Barrel re-exporting the whole public surface. | — |
| `src/types/` | All interfaces/types (`CliConfig`, `Command`, `CommandOption`, `CommandContext`, `CommandRegistry`, `ParsedCommand`, `BannerConfig`). | [command-model.md](./command-model.md) |
| `src/registry/` | Singleton `CommandRegistry` + helper functions; namespacing of subcommands/aliases. | [registry.md](./registry.md) |
| `src/run/` | `runCli` and its helpers: command building, arg parsing, context, subcommand dispatch, help command. | [run.md](./run.md) |
| `src/config.ts` | Project-config file loader with caching (`loadConfig`, `withConfig`, `clearConfigCache`). | [run.md](./run.md) |
| `src/help/` | Default + per-command help rendering and line formatters. | [help.md](./help.md) |
| `src/utils/banner.ts` | Banner rendering (boxed/minimal/none). | [help.md](./help.md) |
| `src/utils/output/` | Logger-backed console helpers (`printError`/`printSuccess`/`printInfo`/`printSection`/`formatCommandHelp`). | [output-and-validation.md](./output-and-validation.md) |
| `src/utils/validate/` | Option validation, default application, type coercion. | [output-and-validation.md](./output-and-validation.md) |
| `src/errors/` | `CliError` hierarchy. | [output-and-validation.md](./output-and-validation.md) |
| `src/tests/` | Bun unit tests (no live services). | — |

## Architecture overview

```
        CliConfig
            │
   runCli(config) ─────────────────────────────────────────────┐
            │                                                    │
            ├─ clearRegistry()                                   │
            ├─ cac(name); cli.version(); cli.help()             │
            ├─ cli.option("--verbose") (unless disabled)         │
            ├─ for cmd in config.commands: registry.register(cmd)│
            ├─ handleHelpCommand(cli)        ── "help [command]" │
            ├─ for cmd in registry.getAll(): registerSingleCommand(cli, cmd)
            │        (skips parents that have subcommands)        │
            ├─ printBanner(...)                                   │
            ├─ no args / --help / -h → printDefaultHelp → exit(0) │
            ├─ MANUAL SUBCOMMAND DISPATCH  ◄──────── parseCommandArgs
            │   (parent+sub → build ctx → handler → exit)         │
            └─ cli.parse()  ── cac runs the matched leaf command ─┘
                                   │
                                   ▼ (cac action)
                 coerceOptions → applyDefaults → validateOptions
                       → loadConfig → buildCommandContext → handler → exit
```

### Two dispatch paths (the central design wrinkle)

`runCli` resolves a command in **two different ways**, and they do not share the same option pipeline:

1. **Leaf commands** are registered with cac via `registerSingleCommand`. cac parses, then the cac action runs the full pipeline: `coerceOptions` → `applyDefaults` → `validateOptions` → `loadConfig` → `buildCommandContext` → `handler`. This path has type coercion, required-option validation, config injection, and the `onError` hook.

2. **Subcommands** (`parent subcmd ...`) are intercepted **before** `cli.parse()` by a block in `runCli` that uses the framework's own `parseCommandArgs`, builds a context inline, calls the subcommand handler, and `process.exit`s. This path uses `parseCommandArgs` (its own coercion-from-`type` and default application) but **skips** `validateOptions`, `loadConfig`/config injection, and `onError`. See [run.md](./run.md#subcommand-dispatch-vs-leaf-dispatch) for the consequences.

Parent commands that declare `subcommands` are intentionally **not** registered with cac (`registerSingleCommand` returns early), so the only way to reach a subcommand is via the manual path.

## Control / data flow per invocation

1. **Validate config** — `runCli` throws if `name` or `version` is missing.
2. **Build cac** — version, help, optional `--verbose` global flag.
3. **Register** — config commands into the singleton registry (which recursively registers subcommands/aliases with namespacing), then each non-parent command into cac.
4. **Resolve** — `resolveCommandName(argv)` returns the first non-flag token (or `null`).
5. **Banner / default help** — print banner unless `banner === false`; if no args or top-level `--help`/`-h`, print default help and exit `0`.
6. **Subcommand short-circuit** — if the resolved command has subcommands and a second token resolves to a registered subcommand, dispatch it manually and exit.
7. **`cli.parse()`** — otherwise hand off to cac, which runs the matched leaf command's action.

## Invariants & design decisions

- **Singleton registry.** Commands are defined once at startup; a module-level instance avoids threading a registry object around. `runCli` calls `clearRegistry()` first so repeated runs (and tests) start clean.
- **Don't expose cac.** Consumers get clean typed data (`CommandContext`), not cac objects, so the parser can be swapped without breaking the public API.
- **`runCli` owns the process.** Both dispatch paths end in `process.exit(result.exitCode)`. This is why it is unsuitable for embedding in a long-running process.
- **Subcommand namespacing.** The registry stores subcommands under `parent:child` to prevent collisions with top-level commands (see [registry.md](./registry.md)).
- **Verbose handling is configurable.** `verbose.handler: "auto"` (default) logs "Verbose mode enabled"; `"manual"` leaves it to the handler (it still receives `options.verbose`).
- **Config is cached.** `loadConfig` caches the first non-null result process-wide; `clearConfigCache()` resets it (important between tests).
- **Unknown flags are tolerated** by `parseCommandArgs` (ignored, not errors); cac has its own handling on the leaf path.

## Known sharp edges

- The two dispatch paths diverge in validation/config behavior (above). If you rely on `required` options or `configLoader` injection, be aware they currently only fire on the **leaf** (cac) path, not on subcommands.
- `config.helpTemplate` is part of `CliConfig` but `runCli` always uses `printDefaultHelp`; the custom template is **not** wired into the run loop today. See [help.md](./help.md).
- `buildCommandContext` recomputes positional args from `process.argv` (via `extractPositionalArgs`), independent of `parseCommandArgs`' positional output — see [run.md](./run.md).

## Detail docs

- [command-model.md](./command-model.md) — the type model: `Command`, `CommandOption`, `CommandContext`, `CliConfig`, registry/parsed-command types.
- [registry.md](./registry.md) — the command registry and namespacing rules.
- [run.md](./run.md) — `runCli`, arg parsing, context building, subcommand dispatch, config loading.
- [help.md](./help.md) — help rendering and the banner.
- [output-and-validation.md](./output-and-validation.md) — output helpers, validation/coercion, and errors.
