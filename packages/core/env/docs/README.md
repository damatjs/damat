# @damatjs/load-env — Internals

Maintainer-facing documentation for `@damatjs/load-env`. For the user-facing overview
see the [package README](../README.md).

This is a two-file package: a loader that decides *which* file to read and how to merge
it into `process.env`, and a parser that turns `.env` text into key/value pairs. There
are no runtime dependencies.

## Module map

| File                   | Responsibility                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `src/index.ts`         | `loadEnv()` — builds the file cascade, reads every existing file, merges them.       |
| `src/parseEnvFile.ts`  | `parseEnvFile()` — line-by-line parser (comments, quotes, inline comments).          |
| `package.json`         | Name `@damatjs/load-env`, version, `exports` map (`.` → `dist/index.js`).            |
| `tsconfig.json`        | Extends `@damatjs/typescript-config/base.json`; `@/*` path alias → `src/*` (resolved at build by `tsc-alias`). |

`src/index.ts` is the package entry point and exports `loadEnv`. It imports
`parseEnvFile` from `src/parseEnvFile.ts` for internal use; `parseEnvFile` is **not**
re-exported and is not part of the public API.

## Architecture overview

```
loadEnv(environment, cwd)
  │
  ├─ snapshot preexisting = new Set(Object.keys(process.env))
  │
  ├─ build cascade:  [".env", ".env.local", ".env.{env}", ".env.{env}.local"]
  │
  ├─ for each candidate (in order, all of them):
  │     ├─ path.join(cwd, candidate)
  │     ├─ fs.existsSync? ──no──► skip to next candidate
  │     └─ yes:
  │           ├─ fs.readFileSync(utf-8)
  │           ├─ parseEnvFile(content)  ──►  Record<string,string>
  │           └─ for each [key,value]: set process.env[key]
  │                 only if value is truthy AND key ∉ preexisting
  │
  └─ (no file found) → process.env unchanged
```

The full step-by-step behavior, parsing rules, and the cascade merge semantics are
documented in [architecture.md](./architecture.md).

## Control / data flow

1. The caller invokes `loadEnv(environment, cwd)` once, early in process startup.
2. `loadEnv` snapshots the keys already in `process.env` into a `preexisting` set, then
   constructs an ordered list of candidate filenames based on `environment`.
3. It iterates **every** candidate in order; each file that exists is read, parsed, and
   merged. Lower-priority files (`.env`) are merged first, higher-priority files
   (`.env.{env}.local`) last, so the last writer of a shared key wins among the files.
4. Merge respects the snapshot: a key is written only if it has a truthy value *and* it
   was **not** in `preexisting`. Pre-existing (system) variables therefore win, and a key
   first set by an earlier file can still be overridden by a later file (because the
   snapshot is frozen before the loop and does not grow as keys are added).
5. Read/parse errors for a candidate are caught, logged via `console.warn`, and the loop
   continues to the next candidate.

## Invariants & design decisions

- **Zero dependencies.** Only `node:fs` and `node:path`. Keeps the package light and at
  the bottom of the dependency graph.
- **All matching files are merged; later files override earlier.** The loop reads every
  existing file in cascade order. The effective precedence is
  `.env.{env}.local` > `.env.{env}` > `.env.local` > `.env`, realized by *layering* (each
  file overwrites shared keys set by lower-priority files). See
  [architecture.md](./architecture.md).
- **System env always wins.** Keys present in `process.env` before the call are captured
  in a snapshot and never overwritten, so exported shell variables and platform-injected
  vars are preserved.
- **Falsy values are skipped.** The merge guard is `if (value && ...)`, so empty-string
  values parsed from a file are *not* written.
- **Failures are non-fatal.** A failed read/parse warns and is skipped, never throws.

## Gotchas

- Shared defaults layer correctly: keep common values in `.env` and override a subset in
  `.env.{env}` or the `.local` variants. Every existing file is read, and the
  higher-priority file's value for a shared key wins.
- The "system env wins" guard uses a snapshot taken **before** the loop, not a live
  `process.env` check. A key first written by `.env` is therefore still overridable by a
  later file in the same call — only keys that existed *before* `loadEnv` ran are locked.
- The parser supports neither variable expansion (`${VAR}`) nor multiline values nor
  `export ` prefixes. See [architecture.md](./architecture.md) for the exact rules.

## Related docs

- [architecture.md](./architecture.md) — load order and parsing, in depth.
- [Package README](../README.md)
- [Damat guide](../../../../docs/GUIDE.md)
