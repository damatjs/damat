# Formatting — levels, colors, and output formats

How `@damatjs/logger` turns a log call into a string. Covers the level system
([`colors.ts`](../src/colors.ts)), the `Colorizer` ([`colorizer.ts`](../src/colorizer.ts)),
and the `Formatter` ([`formatter.ts`](../src/formatter.ts)). These three files are
internal — not re-exported from `index.ts`.

## Responsibility

- Decide whether an entry passes the configured level threshold.
- Style text (badges, labels, timestamps, prefixes, context, error blocks) with ANSI
  colors when the terminal supports it.
- Render a `LogEntry` to a single string for one of three formats: `json`, `pretty`,
  `simple`.

## Levels & thresholds

There are **ten** levels. Each has a numeric threshold (`LOG_LEVELS`) and a visual style
(`LEVEL_STYLES`) in [`colors.ts`](../src/colors.ts):

| Level      | `LOG_LEVELS` | Badge | Label     | Color           | Console stream  |
| ---------- | ------------ | ----- | --------- | --------------- | --------------- |
| `debug`    | 0            | ◯     | `DEBUG`   | cyan            | `console.log`   |
| `info`     | 1            | ●     | `INFO `   | blue            | `console.log`   |
| `progress` | 2            | ⟳     | `PROG `   | blue            | `console.log`   |
| `waiting`  | 3            | ░     | `WAITING` | magenta         | `console.log`   |
| `cached`   | 4            | ⚡    | `CACHE`   | cyan            | `console.log`   |
| `success`  | 5            | ✓     | `OK   `   | green           | `console.log`   |
| `warn`     | 6            | ▲     | `WARN `   | yellow          | `console.warn`  |
| `error`    | 7            | ✗     | `ERROR`   | red             | `console.error` |
| `fatal`    | 8            | ☠     | `FATAL`   | white-on-red bg | `console.error` |
| `skip`     | 9            | →     | `SKIP `   | dim             | `console.log`   |

A level is emitted when `LOG_LEVELS[level] >= minLevel`, where `minLevel` comes from the
configured `level` (default `"info"` → `1`). The stream is chosen in
[`logger.ts:42`](../src/logger.ts): `error`/`fatal` → `console.error`, `warn` →
`console.warn`, everything else → `console.log`.

> Threshold ordering caveat: the numeric ordering places `success` (5), `warn` (6),
> `error` (7), `fatal` (8), and `skip` (9) **above** `info` (1). So setting
> `level: "warn"` filters out `debug`/`info`/`progress`/`waiting`/`cached`/`success`,
> while `error`, `fatal`, and `skip` still pass — but so would nothing *between* `info`
> and `warn` that you might expect to be "more important". Because `skip` is highest, it
> is only suppressed when `minLevel` is set to `skip`. Keep this monotonic numbering in
> mind when adding or reordering levels.

## `Colorizer`

[`colorizer.ts`](../src/colorizer.ts) wraps text in ANSI codes (from
`COLORS` in `colors.ts`) — but only when color is enabled.

Color is enabled when `config.colors` is truthy **and** `supportsColor()` returns true.
`supportsColor()` ([`colorizer.ts:11`](../src/colorizer.ts)) checks, in order:

1. No `process` → `false`.
2. `process.env.NO_COLOR` set → `false`.
3. `process.env.FORCE_COLOR` set → `true`.
4. `process.env.TERM === "dumb"` → `false`.
5. otherwise `process.stdout?.isTTY ?? false`.

Styling helpers: `bold`, `dim`, `timestamp` (dim), `level` (badge + padded label in the
level color), `message` (red for error/fatal, yellow for warn, green for success, dim for
skip, cyan for cached, plain otherwise), `context` (dim JSON), `errorInfo` (red name +
message, dimmed stack), `prefix` (magenta `[name]`). When disabled, every helper returns
the text unchanged.

## `Formatter`

[`formatter.ts`](../src/formatter.ts) owns a `Colorizer` and the chosen `LogFormat`.

### `getTimestamp()`

Returns a local timestamp string `YYYY-MM-DD HH:MM:SS.mmm` (zero-padded). Called by
`Logger.log()` when `timestamp` is enabled.

### `formatEntry(entry)`

[`formatter.ts:22`](../src/formatter.ts) receives
`{ timestamp, level, message, context, error, prefix }` and renders by format:

- **`json`** → `JSON.stringify(entry)` of the whole entry object. (Note: the `prefix` is
  part of this object and the `context`/`error` shapes are the normalized ones.)
- **`pretty`** (and **`simple`**) → assembles space-joined parts in order:
  `timestamp` (if any) · `level` (colorized badge+label) · `prefix` (if any) ·
  `message` (colorized by level) · `context` (dim JSON, only if non-empty), then appends
  the colorized `errorInfo` block on its own lines if an error is present.

> `simple` is not special-cased in `formatEntry()` — only `json` branches; every
> non-`json` format (including `simple`) takes the `pretty` path. If you want `simple` to
> differ, add an explicit branch here.

## The `error` / `fatal` argument quirk

In [`logger.ts`](../src/logger.ts) the two error-carrying methods pass arguments to the
private `log(level, message, context?, error?)` differently:

```ts
error(message, error?, context?) { this.log("error", message, context, error); } // error → 4th arg ✔
fatal(message, error?, context?) { this.log("fatal", message, context, error); } // error → 3rd arg ✘
```

`fatal` swaps the positions: the value you pass as the *error* is forwarded into the
*context* slot, and the *context* you pass goes into the *error* slot. As a result a
`fatal` "error" object is treated as context (and only stringified into context if it is
a non-empty object), while a context object passed to `fatal` is only rendered as an
error block if it happens to be an `Error` instance. Prefer `error()` when you need
proper stack capture; treat this as a known bug if you touch `logger.ts`.

## Error normalization

Regardless of method, only values that are `instanceof Error` are normalized (in
[`logger.ts:32`](../src/logger.ts)) into `{ name, message, stack }` for both the file
transport and the formatter. Non-`Error` values passed as the error argument are ignored
for the error block.

## Safe extension

- **New format:** add it to `LogFormat` in `types.ts`, then add a branch in
  `formatEntry()`. Remember `simple` currently aliases `pretty`.
- **New level color/badge:** add to `LEVEL_STYLES` and `LOG_LEVELS` in `colors.ts`; pick
  a numeric threshold that reflects intended verbosity ordering.
- **Custom message coloring:** extend `Colorizer.message()`'s level switch.
