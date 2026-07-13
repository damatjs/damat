# Output, validation & errors

Covers `src/utils/output/`, `src/utils/validate/`, and `src/errors/`.

## Output helpers — `src/utils/output/`

Small wrappers around `@damatjs/logger` and `console.log` for consistent spacing. Re-exported via `src/utils/output/index.ts` → `src/utils/index.ts` → `src/index.ts`.

```ts
printError(logger: ILogger, message: string, suggestion?: string): void;   // blank line, logger.error, optional suggestion
printSuccess(logger: ILogger, message: string, details?: string): void;    // blank line, logger.success, optional details
printInfo(logger: ILogger, message: string, details?: string): void;       // blank line, logger.info, optional details
printSection(title: string, content: string[]): void;                      // "\n<title>:" then "  <line>" per item
formatCommandHelp(name: string, description: string, usage?: string): string; // 20-col padded help line (+ optional Usage)
```

`printError`/`printSuccess`/`printInfo` all surround their message with blank lines (via `console.log("")`) so output is visually separated; the message itself goes through the logger (which applies level styling). `printSection` and `formatCommandHelp` use `console.log`/string building directly. These are convenience helpers for command authors — `runCli` itself uses the raw `logger` for its own messages.

## Validation & coercion — `src/utils/validate/`

The leaf-dispatch pipeline (`registerCommand.ts`) runs these in order: **coerce → applyDefaults → validate**.

### `coerceOptions` / `coerceOptionValue` — `coerceOptions.ts`

```ts
function coerceOptionValue(
  value: unknown,
  type: CommandOption["type"],
): unknown;
function coerceOptions(
  options: Record<string, unknown>,
  optionDefs?: CommandOption[],
): Record<string, unknown>;
```

`coerceOptionValue` maps a value to its declared `type`:

- `undefined` / `null` → returned as-is.
- `"number"` → `Number(value)`, but if the result is `NaN` the **original value is returned** (so a non-numeric input isn't silently turned into `NaN`).
- `"boolean"` → `Boolean(value)` (note: any non-empty string, including `"false"`, is truthy → `true`).
- `"string"` / default → `String(value)`.

`coerceOptions` returns options unchanged when there are no defs; otherwise it rebuilds the object, matching each key to a def by `name` **or** `alias` and coercing by that def's `type`. Keys without a matching def are coerced with `type = undefined` → `String(value)`.

### `applyDefaults` — `applyDefaults.ts`

```ts
function applyDefaults(options, optionDefs?): Record<string, unknown>;
```

Copies `options`, then for each def whose value is still `undefined` and whose `default !== undefined`, fills the default. No-op (returns input) when there are no defs. Only fills missing keys — provided values are never overwritten.

### `validateOptions` — `validateOptions.ts`

```ts
function validateOptions(options, optionDefs?, commandName: string): void;
```

For each def with `required: true`: if the value is `undefined`/`null` **and** the def has no `default`, throw `MissingRequiredOptionError(name, commandName)`. A `default` therefore satisfies a `required` check (the default would already have been applied upstream). No-op without defs.

### Pipeline note

This pipeline runs only on the **leaf (cac) path**. The subcommand path (`parseCommandArgs` in `run/buildCommand.ts`) applies defaults and coerces numbers/booleans itself but does **not** call `validateOptions` — so `required` is not enforced for subcommands (see [run.md](./run.md)). The framework's `parseCommandArgs` and these `utils/validate` functions are two separate implementations of overlapping logic; keep them aligned when changing coercion rules.

## Errors — `src/errors/`

A small hierarchy rooted at `CliError`, all re-exported via `src/errors/index.ts`.

```ts
class CliError extends Error { constructor(message: string, public exitCode = 1) }          // base
class CommandNotFoundError extends CliError       // "Unknown command: <name>"
class MissingRequiredOptionError extends CliError // "Missing required option '--<opt>' for command '<cmd>'"
class ConfigLoadError extends CliError            // "Failed to load config from '<file>'[: <cause>]"
class CommandRegistrationError extends CliError   // "Failed to register command '<name>': <reason>"
```

- Every subclass sets `exitCode` (all `1`) and a distinct `name`, and is `instanceof CliError`.
- `CliError` is what the leaf pipeline catches around `validateOptions`: a thrown `CliError` is logged and `process.exit(error.exitCode)`; non-`CliError`s rethrow.
- `CommandRegistrationError` is thrown by the registry during setup (duplicate name/alias). `ConfigLoadError` is thrown by `loadConfig`. `MissingRequiredOptionError` is thrown by `validateOptions`. `CommandNotFoundError` exists for consumers — note `runCli`/`handleHelpCommand` currently log a plain "Unknown command" string rather than throwing this class, so it's available for your own handlers.

## Safe extension

- New errors should extend `CliError`, set a sensible `exitCode` and unique `name`, and be exported from `errors/index.ts` (so they remain `instanceof CliError` and get caught by the existing handler).
- A new `CommandOption.type` needs a branch in **both** `coerceOptionValue` and the framework's `parseCommandArgs`, plus a coercion test in `src/tests/validate.test.ts`.
- New output helpers belong under `src/utils/output/` (one export per file) and should take an `ILogger` for any leveled output so styling stays consistent.
