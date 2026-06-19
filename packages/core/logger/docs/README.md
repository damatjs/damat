# @damatjs/logger — Internals

Maintainer-facing documentation for `@damatjs/logger`. For the user-facing overview see
the [package README](../README.md).

It is a centralized, zero-dependency logging package: colorized console output plus an
optional dual-format file transport for post-mortem analysis. It uses only Node's
built-in `fs`/`path` and raw ANSI escape codes — no external packages.

## Module map

| File / dir              | Responsibility                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `src/index.ts`          | Public API barrel. Re-exports `types`, `logger`, `child`, `noop`, `file-transport`, `global`, `utils`. **Does not** export `colorizer`, `colors`, `formatter`. |
| `src/types.ts`          | All interfaces & type aliases: `LogLevel`, `LogFormat`, `LoggerConfig`, `LogContext`, `LogEntry`, `RequestLogData`, `FileTransportConfig`, `ILogger`. |
| `src/colors.ts`         | ANSI codes (`COLORS`), per-level styles (`LEVEL_STYLES`), numeric thresholds (`LOG_LEVELS`). *(internal)* |
| `src/colorizer.ts`      | `Colorizer` — TTY/color detection and text styling. *(internal)*                        |
| `src/formatter.ts`      | `Formatter` — timestamp generation and entry → string for each format. *(internal)*     |
| `src/file-transport.ts` | `FileTransport` — buffering, size rotation, `.log` + `.md` rendering, env-var gating.    |
| `src/logger.ts`         | `Logger` — the main implementation; wires formatter + file transport, level filtering.  |
| `src/child.ts`          | `ChildLogger` — context/prefix inheritance, delegates to parent `Logger`.               |
| `src/noop.ts`           | `NoopLogger` + shared `NOOP_LOGGER` — discards all output.                              |
| `src/global.ts`         | Process-global singleton, lifecycle helpers, and top-level convenience functions.       |
| `src/utils.ts`          | `separator` / `successBanner` / `errorBanner` — standalone console banners.             |

## Architecture overview

```
                    ┌───────────────┐
   user code  ───►  │    Logger     │  (or ChildLogger ─► parent Logger)
                    └───────┬───────┘
                            │ Logger.logWithPrefix(level, msg, prefix, ctx?, error?)
            shouldLog? ─────┤   (LOG_LEVELS[level] >= minLevel)
                            │
              ┌─────────────┼──────────────────────────┐
              ▼             ▼                           ▼
        Formatter     FileTransport (opt-in)      console.{log|warn|error}
     formatEntry()      .log() → buffers              by level
        │  uses           │ (.log + .md)
        ▼  Colorizer      ▼ setInterval flush()
   string output      append to logs/YYYY-MM-DD_all.{log,md}  (+ rotation)
```

`Logger` is the orchestrator. On construction it builds a `Formatter` (which owns a
`Colorizer`) and, if file logging is requested/enabled, a `FileTransport`. Every leveled
method funnels through `logWithPrefix(level, message, prefix, context?, error?)` — the
`Logger`'s own methods call it via the private `log()` wrapper (passing the logger's
configured `prefix`), and a `ChildLogger` calls it directly (passing the child's prefix).
`logWithPrefix` then:

1. Drops the entry if its level is below the configured minimum (`shouldLog`).
2. Computes a timestamp (if `timestamp` enabled) and normalizes any `Error` into
   `{ name, message, stack }`.
3. Hands a `LogEntry` to the file transport (if present).
4. Formats the entry to a string and writes it to the matching console stream
   (`console.error` for `error`/`fatal`, `console.warn` for `warn`, else `console.log`).

## Control / data flow details

- **Level filtering** uses the `LOG_LEVELS` numeric map in `colors.ts`. Lower number =
  more verbose. `debug` is `0`; `skip` is `9`. `shouldLog(level)` is
  `LOG_LEVELS[level] >= minLevel`. See [formatting.md](./formatting.md) for the full
  table and an important note on this ordering.
- **Error placement differs by method.** `error()` passes the error as the 4th `log()`
  argument; `fatal()` passes it 3rd (so a `fatal` "error" object lands in the `context`
  slot). This quirk is documented in [formatting.md](./formatting.md).
- **Children never format.** `ChildLogger` only merges context/prefix and forwards to the
  parent `Logger`, so formatting/transport happen exactly once. See
  [child-loggers.md](./child-loggers.md).
- **File transport is buffered** and flushed on an interval (default 1s) or on `close()`.
  See [transports.md](./transports.md).
- **Global singleton** is lazily created by `getLogger()`; convenience functions wrap it.
  See [global.md](./global.md).

## Invariants & design decisions

- **Zero dependencies.** Built-ins only. The package sits near the bottom of the build
  graph and is imported almost everywhere.
- **Two output sinks, independently gated.** Console output is always on (subject to
  level). File output is opt-in via config (`file.enabled`) or env var
  (`LOG_FILE` / `LOGGING_FILE_ON` = `true`/`1`).
- **Dual file formats.** `.log` (grep-friendly) and `.md` (emoji-annotated, human
  review) are written together, date-stamped (`logs/YYYY-MM-DD_all.{log,md}`).
- **Color is auto-detected** and degrades gracefully: respects `NO_COLOR`, `FORCE_COLOR`,
  `TERM=dumb`, and `process.stdout.isTTY`.
- **`ILogger` is the contract.** `Logger`, `ChildLogger`, and `NoopLogger` all implement
  it, so any can be swapped in (e.g. `NOOP_LOGGER` in tests/libraries).
- **`json` format serializes the raw entry**; `pretty` colorizes; `simple` currently
  shares the `pretty` code path (it is not special-cased). See
  [formatting.md](./formatting.md).

## Split guides

- [formatting.md](./formatting.md) — levels, thresholds, `Colorizer`, `Formatter`, the
  three formats, and the `error`/`fatal` argument quirk.
- [transports.md](./transports.md) — `FileTransport`: enable conditions, buffering,
  rotation, `.log`/`.md` rendering, lifecycle.
- [child-loggers.md](./child-loggers.md) — `child`, `withPrefix`, context merge order,
  prefix nesting, `NoopLogger`.
- [global.md](./global.md) — the singleton, lifecycle helpers, convenience functions,
  and `createContextLogger`.

## Safe extension (quick reference)

**Add a log level:** update `LogLevel` in `types.ts`; add a `LEVEL_STYLES` entry and a
`LOG_LEVELS` number in `colors.ts`; add the method to `ILogger`; implement it in
`Logger`, `ChildLogger`, and `NoopLogger`; add an emoji in `file-transport.ts`'s
`LEVEL_EMOJI`; optionally add a convenience wrapper in `global.ts`.

**Add a format:** extend `LogFormat` in `types.ts` and handle it in
`Formatter.formatEntry()`.

**Change file output:** edit `formatLog()` (`.log`) / `formatMd()` (`.md`) in
`file-transport.ts`.

## Related docs

- [Package README](../README.md)
- [Damat guide](../../../../docs/GUIDE.md)
