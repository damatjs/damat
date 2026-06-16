# Help & banner

Covers `src/help/` (`index.ts`, `printDefaultHelp.ts`, `printCommandSpecificHelp.ts`, `formatCommandLine.ts`, `formatOptionLine.ts`) and `src/utils/banner.ts`.

All output goes through `console.log` directly (not the logger), so help/banner render as plain stdout.

## `printDefaultHelp` — `src/help/printDefaultHelp.ts`

```ts
function printDefaultHelp(config: CliConfig, commands: Command[]): void
```

Renders the top-level help:

```
Usage: <name> [command] [options]

<description?>

Commands:
  <formatCommandLine per command>

Global Options:
  -h, --help           Show help
  -v, --version        Show version
  --verbose            Enable verbose output   (only if verbose.enabled !== false)

Run '<name> help <command>' for more information.
```

The `Commands:` block is omitted when `commands` is empty; the `--verbose` line is conditional on `config.verbose?.enabled !== false`.

## `printCommandSpecificHelp` — `src/help/printCommandSpecificHelp.ts`

```ts
function printCommandSpecificHelp(config: { name: string }, command: Command): void
```

Delegates to an internal `printCommandHelp(cmd, cliName)` which prints:

```
Command: <name>

  <description>

Usage: <cli> <usage | "<name> [options]">

Options:                        (if cmd.options)
  <formatOptionLine per option>

Examples:                       (if cmd.examples)
  <each example>

Subcommands:                    (if cmd.subcommands)
  <formatCommandLine per subcommand>
```

`usage` overrides the default `"<name> [options]"` usage line. Options/examples/subcommands sections are each printed only when present.

## Line formatters

### `formatCommandLine` — `src/help/formatCommandLine.ts`

```ts
`  ${cmd.name.padEnd(20)}${cmd.description}` + (aliases ? ` (aliases: a, b)` : "")
```

Two-space indent, name left-padded to 20 columns, then description, then an optional `(aliases: ...)` suffix.

### `formatOptionLine` — `src/help/formatOptionLine.ts`

```ts
const flag = opt.alias ? `-${opt.alias}, --${opt.name}` : `--${opt.name}`;
`  ${flag.padEnd(20)}${opt.description}`
  + (opt.default !== undefined ? ` (default: ${JSON.stringify(opt.default)})` : "")
  + (opt.required ? " [required]" : "");
```

Same 20-column layout; appends `(default: ...)` (JSON-stringified) and `[required]` when applicable.

## Banner — `src/utils/banner.ts`

```ts
function printBanner(config: CliConfig, bannerConfig: BannerConfig = {}): void
```

- `style` defaults to `"boxed"`; `title` defaults to `config.name` (or `"CLI"`); `subtitle` defaults to `config.description` (or `""`).
- `style: "none"` → prints nothing.
- `style: "minimal"` → prints `title` then `subtitle` (if any), no box.
- `style: "boxed"` (default) → a Unicode box (`┌ ─ ┐ │ ├ ┤ └ ┘`) at least 60 columns wide, with the title on top and, if a subtitle exists, a divider and the subtitle below.

`runCli` calls `printBanner(config, config.banner)` when `config.banner` is an object, or `printBanner(config)` when it's absent; `config.banner === false` skips the call entirely.

## Gotcha — `helpTemplate` is not wired in

`CliConfig.helpTemplate` (a `(config, commands) => string`) exists in the types and is documented as a customization hook, but **`runCli` never calls it** — it always uses `printDefaultHelp`. Today the way to customize help output is to fork/replace `printDefaultHelp` behavior, not to set `helpTemplate`. If you want to honor it, the place to branch is `runCli`'s default-help block and `handleHelpCommand`.

## Safe extension

- Keep the 20-column `padEnd` convention consistent across `formatCommandLine`/`formatOptionLine`/`formatCommandHelp` so columns line up.
- If you implement `helpTemplate`, fall back to `printDefaultHelp` when it's absent, and route both the no-args case (in `runCli`) and the `help` command (in `handleHelpCommand`) through the same chooser.
