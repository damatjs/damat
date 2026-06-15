# Run loop, parsing, context & config

Covers `src/run/` (`runCli.ts`, `buildCommand.ts`, `buildOption.ts`, `registerCommand.ts`, `resolveCommand.ts`, `helpCommand.ts`) and `src/config.ts`.

## `runCli` — `src/run/runCli.ts`

The entry point. Signature: `async function runCli(config: CliConfig): Promise<void>` (though in practice it calls `process.exit` and never returns normally).

Step by step:

1. **Validate** — throw if `config.name` / `config.version` is missing.
2. **Reset** — `clearRegistry()`.
3. **Build cac** — `const cli = cac(config.name)`; `cli.version(config.version)`; `cli.help()`.
4. **Logger** — `new Logger({ timestamp: false })` from `@damatjs/logger`, reused everywhere below.
5. **Verbose flag** — unless `config.verbose?.enabled === false`, register `cli.option("--verbose", ...)`.
6. **Register commands** — `for (cmd of config.commands) getRegistry().register(cmd)` (recursive; see [registry.md](./registry.md)).
7. **Help command** — `handleHelpCommand(cli, config, logger)` adds a `help [command]` cac command.
8. **Register leaf commands with cac** — `for (cmd of getRegistry().getAll()) registerSingleCommand(cli, cmd, config, logger)`.
9. **Resolve** — `const commandName = resolveCommandName(process.argv.slice(2))`.
10. **Banner** — if `config.banner !== false`, `printBanner(config, config.banner | undefined)`.
11. **Default help** — if no args or `args[0]` is `--help`/`-h`: `printDefaultHelp(...)` then `process.exit(0)`.
12. **Subcommand dispatch** — if the resolved command exists, has `subcommands`, and `args.length > 1`, try to dispatch a subcommand manually (below). On success it exits.
13. **Hand off** — `cli.parse()`. cac matches and runs the leaf command's action.

If step 12 finds the parent but the command is unknown, it logs `Unknown command: <name>`, prints default help, and exits `1`.

## Subcommand dispatch vs. leaf dispatch

These are the two paths and they behave differently.

### Manual subcommand path (in `runCli`)

```ts
if (cmd.subcommands && args.length > 1) {
  const subcommandName = args[1];
  const fullName = `${cmd.name}:${subcommandName}`;
  const subcmd = getRegistry().get(fullName) || getRegistry().get(subcommandName);
  if (subcmd && subcmd !== cmd) {
    const { options, positional } = parseCommandArgs(args.slice(2), subcmd.options);
    const ctx = buildCommandContext(fullName, options, logger, config);
    const result = await subcmd.handler({ ...ctx, args: positional });
    process.exit(result.exitCode);
  }
}
```

It uses the framework's own `parseCommandArgs` and then calls the handler. This path **does not**: run `validateOptions` (so `required` options aren't enforced), load `configLoader`/inject `ctx.options.config`, or invoke `config.onError` on throw. Note `ctx.args` is overridden with `positional` from `parseCommandArgs` (the value `buildCommandContext` computed for `args` is discarded here).

### Leaf path (`registerSingleCommand` → cac action)

The full pipeline, see below. Parent commands (those with `subcommands`) are **skipped** here, so subcommands are only reachable via the manual path.

## `registerSingleCommand` — `src/run/registerCommand.ts`

```ts
function registerSingleCommand(cli: CAC, cmd: Command, config: CliConfig, logger: Logger): void
```

- **Early return** if `cmd.subcommands` is set (parents aren't registered with cac).
- Creates `cli.command(cmd.name, cmd.description)`; adds aliases via `cacCmd.alias(...)`; adds options via `cacCmd.option(buildOptionFlag(opt), opt.description, { default: opt.default })`.
- The cac **action** runs the leaf pipeline:
  1. Copy cac's parsed options, `delete opts._` (cac's positional bag).
  2. `coerceOptions(opts, cmd.options)` → `applyDefaults(...)`.
  3. `validateOptions(...)` inside try/catch — a `CliError` logs its message and `process.exit(error.exitCode)`; other errors rethrow.
  4. `loadConfig(config.configLoader)` → if truthy, set `ctx.options.config`.
  5. `buildCommandContext(cmd.name, processedOptions, logger, config)`.
  6. **Verbose** — if `ctx.options.verbose`: unless `verbose.handler === "manual"`, `logger.info("Verbose mode enabled")`; always `logger.debug(...)`.
  7. `await cmd.handler(ctx)` → `process.exit(result.exitCode)`. On throw: `logger.error("Command failed: ...")`, call `config.onError(err, ctx)` if present, `process.exit(1)`.

## `buildOptionFlag` — `src/run/buildOption.ts`

```ts
buildOptionFlag({ name, alias }) => alias ? `-${alias}, --${name}` : `--${name}`;
```

Formats an option into a cac flag spec.

## Argument parsing & context — `src/run/buildCommand.ts`

### `parseCommandArgs(args, optionDefs = [])`

The framework's own parser (used on the **subcommand** path; the leaf path uses cac). Returns `{ options, positional }`.

- Seeds `options` with each def's `default` (where defined).
- For each token:
  - Supports `--name value`, `--name=value`, `-a value`, `-a=value`, and boolean flags.
  - `findDef` matches long tokens by `name`, short tokens by `alias`.
  - **Unknown flags are ignored** (`if (!def) continue`), not errors.
  - Boolean: `--flag` → `true`; `--flag=false` → `false` (anything but `"false"` after `=` → true).
  - Otherwise consumes the next token as the value (or the inline `=value`); `type === "number"` → `Number(value)`.
  - Non-dash tokens become `positional`.

### `buildCommandContext(commandName, options, logger, config)`

Builds the `CommandContext`. It computes positionals **independently** via `extractPositionalArgs(process.argv.slice(2).filter(a => a !== commandName))`:

```ts
return { command: commandName, args: positionalArgs, options, logger, cwd: process.cwd() };
```

So `ctx.args` here comes from a fresh scan of `process.argv` (skipping a token after any `-`/`--` flag), **not** from `parseCommandArgs`. On the subcommand path this `args` is then overridden by the caller. (`extractPositionalArgs` is the simpler scanner used for this.)

### `extractPositionalArgs(args)`

Skips flags and the token following them, collecting the rest as positionals.

## `resolveCommandName` — `src/run/resolveCommand.ts`

```ts
resolveCommandName(args) => args[0] && !args[0].startsWith("-") ? args[0] : null;
```

First non-flag token, or `null` (no args / leading flag).

## `handleHelpCommand` — `src/run/helpCommand.ts`

Registers a cac `help [command]` command. With an argument it looks the command up in the registry and prints `printCommandSpecificHelp` (or errors + exit 1 if unknown); without one it prints `printDefaultHelp`. Always exits `0` after.

## Config loading — `src/config.ts`

```ts
async function loadConfig<T>(loaderConfig: ConfigLoader | undefined, cwd = process.cwd()): Promise<T | null>;
function clearConfigCache(): void;
function withConfig<T>(loader): { get: () => Promise<T | null>; clear: () => void };
```

- **Module-level cache** (`cachedConfig`): once a non-null config is loaded, subsequent calls return it without re-reading. `clearConfigCache()` resets it (tests call this between cases).
- Returns `null` when there's no `loaderConfig.file`.
- `file` may be a string or array; the **first existing** file wins (others are skipped). Paths are resolved against `cwd` unless absolute.
- Loading: if a custom `load(filePath)` is provided, use it; otherwise dynamic-`import` the file with a cache-busting `?t=<now>` query, take `mod.default ?? mod`, and if it's a function, call it (so `export default () => ({...})` works).
- Any load/parse error throws `ConfigLoadError(filePath, cause)`.
- `withConfig` is a small closure exposing `get`/`clear` bound to one loader.

On the leaf path, a non-null result is injected as `ctx.options.config`; handlers read it as `ctx.options.config`.

## Gotchas

- **Validation/config asymmetry** — `required` enforcement, config injection, and `onError` only run on the **leaf** (cac) path, not on manually-dispatched subcommands. If you need them for subcommands, validate inside the handler.
- **Config cache is process-wide and sticky** — it caches the first non-null config for the whole process. Call `clearConfigCache()` if the file can change between runs in the same process (e.g. tests).
- **`process.exit` everywhere** — both paths exit; don't rely on `runCli` returning.
- **Positional args computed twice** — once in `parseCommandArgs`, once in `buildCommandContext`/`extractPositionalArgs`. They can differ subtly (different scanners); the subcommand path resolves this by overriding `ctx.args` with the `parseCommandArgs` result.

## Safe extension

- To unify behavior, the cleanest change is to route subcommand dispatch through the same pipeline as `registerSingleCommand` (coerce → defaults → validate → loadConfig → context). Keep both in sync if you touch one.
- New global flags belong next to the `--verbose` registration in `runCli`; remember cac strips them into the options bag, and `delete opts._` is what removes positionals on the leaf path.
