# File transport

`FileTransport` ([`file-transport.ts`](../src/file-transport.ts)) is the optional,
buffered, dual-format file sink. It is re-exported from `index.ts`, but is normally
driven indirectly through `Logger` (which constructs one from `LoggerConfig.file`).

## Responsibility

Persist log entries to disk for post-mortem analysis without slowing the hot path:

- Buffer entries in memory and flush on a timer (or on `close()`).
- Write two files per day: a grep-friendly `.log` and a human-readable `.md`.
- Rotate a file when it exceeds a size cap.
- Stay completely inert unless explicitly enabled.

## When it is active

`Logger` only constructs a `FileTransport` when `config.file` is provided **and**
`config.file.enabled !== false` ([`logger.ts:20`](../src/logger.ts)). The transport
itself then computes its own `enabled` flag ([`file-transport.ts:30`](../src/file-transport.ts)):

```ts
this.enabled =
  config.enabled === true ||
  process.env.LOG_FILE === "true" ||
  process.env.LOG_FILE === "1" ||
  process.env.LOGGING_FILE_ON === "true" ||
  process.env.LOGGING_FILE_ON === "1";
```

So a transport is "live" when either `file.enabled: true` is passed, or one of the env
vars `LOG_FILE` / `LOGGING_FILE_ON` is `true`/`1`. If a `FileTransport` is constructed but
`enabled` resolves to `false`, it short-circuits in the constructor (no directory, no
timer) and `log()` is a no-op.

> Two-layer gate: passing `file: { enabled: false }` prevents the transport from being
> created at all (Logger's check). Passing `file: {}` _creates_ a transport whose own
> `enabled` then depends on the env vars. To force file logging on regardless of env,
> pass `file: { enabled: true }`.

## Configuration (`FileTransportConfig`)

| Field           | Default                     | Meaning                                                             |
| --------------- | --------------------------- | ------------------------------------------------------------------- |
| `enabled`       | env-derived                 | Force-enable when `true` (see above).                               |
| `dir`           | `"logs"`                    | Output directory (created recursively on first use).                |
| `maxSizeBytes`  | `10 * 1024 * 1024` (10 MiB) | Rotation threshold per file.                                        |
| `bufferFlushMs` | `1000`                      | Flush interval in ms. `0` disables the timer (flush on close only). |
| `errorFile`     | _(unused)_                  | Declared in the type; not currently read by the implementation.     |
| `allFile`       | _(unused)_                  | Declared in the type; not currently read by the implementation.     |

> `errorFile` / `allFile` exist on `FileTransportConfig` but the current implementation
> always writes to date-stamped `all.{log,md}` files and never reads these fields.

## File layout

Files are named `<YYYY-MM-DD>_all.<ext>` inside `dir`
([`getPath`](../src/file-transport.ts), [`getDate`](../src/file-transport.ts)):

```
logs/2026-06-15_all.log
logs/2026-06-15_all.md
```

The date is recomputed at write time, so a long-running process rolls onto new files at
midnight automatically.

## Rendering

For every entry the transport pushes to **both** buffers:

- **`.log`** via `formatLog()` ([`file-transport.ts:69`](../src/file-transport.ts)):
  `[timestamp] [LEVEL] message {context-json}` with an indented error name/message/stack
  block appended when an error is present, terminated by a newline.
- **`.md`** via `formatMd()` ([`file-transport.ts:75`](../src/file-transport.ts)): a
  Markdown section headed with a per-level emoji (`LEVEL_EMOJI`), the message, a fenced
  JSON `Context:` block (only if context is non-empty), an `Error:` line, a fenced stack
  block (if present), and a `---` separator.

`LEVEL_EMOJI` maps each of the ten levels to an emoji (🔍 debug, ℹ️ info, ⏳ progress,
░ waiting, ⚡ cached, ✅ success, ⚠️ warn, ❌ error, 💀 fatal, ⏭️ skip); unknown levels
fall back to 📝.

## Buffering, flushing, rotation

1. `log(entry)` — no-op if disabled; otherwise appends the rendered `.log` and `.md`
   strings to in-memory buffers ([`file-transport.ts:88`](../src/file-transport.ts)).
2. A `setInterval(flush, bufferFlushMs)` timer is started in the constructor unless
   `bufferFlushMs === 0`.
3. `flush()` ([`file-transport.ts:94`](../src/file-transport.ts)) — if the buffers are
   non-empty, writes both joined buffers to their dated paths and clears the buffers.
4. `write(filepath, content)` calls `rotate()` first, then `appendFileSync`.
5. `rotate(filepath)` ([`file-transport.ts:56`](../src/file-transport.ts)) — if the file
   exists and its size is `>= maxSizeBytes`, it is renamed with an ISO-timestamp suffix
   (`..._2026-06-15T12-00-00-000Z.log`), so the next append starts a fresh file.

## Lifecycle

- The directory is created (`mkdirSync(..., { recursive: true })`) once in the
  constructor when enabled.
- Call `Logger.close()` ([`logger.ts`](../src/logger.ts)) on shutdown — it calls
  `FileTransport.close()`, which clears the flush interval and performs a final `flush()`.
  Forgetting this can lose up to one buffer interval of logs and leaves the interval
  timer running.

## Gotchas

- Writes are **synchronous** (`appendFileSync`, `statSync`, `renameSync`). Fine for the
  intended low-to-moderate volume; not suited to extreme throughput.
- Rotation is checked per `write()` (i.e. per flush), not per entry, so a single flush can
  push a file slightly past `maxSizeBytes` before rotating on the next flush.
- Both `.log` and `.md` are always written together; there is no way to enable only one.

## Safe extension

- To add per-level files, wire `errorFile`/`allFile` into `getPath`/`flush` (they are
  already in the config type).
- To change formats, edit `formatLog()` / `formatMd()` only — buffering and rotation are
  format-agnostic.
- To support async writes, replace the `*Sync` calls but preserve the flush-on-`close()`
  contract that `Logger.close()` relies on.
