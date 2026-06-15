# @damatjs/load-env — Internals

Maintainer-facing documentation for `@damatjs/load-env`. For the user-facing overview
see the [package README](../README.md).

This is a two-file package: a loader that decides *which* file to read and how to merge
it into `process.env`, and a parser that turns `.env` text into key/value pairs. There
are no runtime dependencies.

## Module map

| File                   | Responsibility                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `src/index.ts`         | `loadEnv()` — builds the file cascade, reads the first existing file, merges it.     |
| `src/parseEnvFile.ts`  | `parseEnvFile()` — line-by-line parser (comments, quotes, inline comments).          |
| `package.json`         | Name `@damatjs/load-env`, version, `exports` map (`.` → `dist/index.js`).            |
| `tsconfig.json`        | Extends `@damatjs/typescript-config/base.json`; `@/*` path alias → `src/*` (resolved at build by `tsc-alias`). |

Both source files are re-exported through `src/index.ts` (which exports `loadEnv` and
imports/uses `parseEnvFile`, itself re-exported from its module).

## Architecture overview

```
loadEnv(environment, cwd)
  │
  ├─ build cascade:  [".env.{env}.local", ".env.{env}", ".env.local", ".env"]
  │
  ├─ for each candidate (in order):
  │     ├─ path.join(cwd, candidate)
  │     ├─ fs.existsSync? ──no──► try next candidate
  │     └─ yes:
  │           ├─ fs.readFileSync(utf-8)
  │           ├─ parseEnvFile(content)  ──►  Record<string,string>
  │           ├─ for each [key,value]: set process.env[key]
  │           │     only if value is truthy AND process.env[key] is undefined
  │           └─ return   ◄── STOPS after the first existing file
  │
  └─ (no file found) → return, process.env unchanged
```

The full step-by-step behavior, parsing rules, and the important "first match wins"
nuance are documented in [architecture.md](./architecture.md).

## Control / data flow

1. The caller invokes `loadEnv(environment, cwd)` once, early in process startup.
2. `loadEnv` constructs an ordered list of candidate filenames based on `environment`.
3. It iterates the list; for the **first** file that exists it reads, parses, merges,
   and then `return`s immediately — later candidates are never consulted.
4. Merge is non-destructive: a key is written only if it has a truthy value *and* is not
   already present in `process.env`. Pre-existing (system) variables therefore win.
5. Read/parse errors for a candidate are caught, logged via `console.warn`, and the loop
   continues to the next candidate.

## Invariants & design decisions

- **Zero dependencies.** Only `node:fs` and `node:path`. Keeps the package light and at
  the bottom of the dependency graph.
- **First existing file wins; no merging across files.** The loop `return`s after the
  first hit. This differs from loaders that layer all files together. See the caveat in
  [architecture.md](./architecture.md) — it also differs from the ordering language in
  the package docstring.
- **System env always wins.** `process.env[key]` is only set when it is currently
  `undefined`, so exported shell variables and platform-injected vars are never
  clobbered.
- **Falsy values are skipped.** The merge guard is `if (value && ...)`, so empty-string
  values parsed from a file are *not* written.
- **Failures are non-fatal.** A failed read/parse warns and is skipped, never throws.

## Gotchas

- The docstring in `src/index.ts` lists the order as `.env` → `.env.local` →
  `.env.{environment}` → `.env.{environment}.local` ("later files override earlier"),
  but the implementation iterates the **reverse** order and stops at the first match.
  The effective precedence is `.env.{env}.local` > `.env.{env}` > `.env.local` > `.env`,
  realized by *selection* (first found), not by *override*. Trust the code.
- Because only one file is loaded, you cannot keep shared defaults in `.env` and override
  a subset in `.env.production` — if `.env.production` exists, `.env` is ignored entirely.
- The parser supports neither variable expansion (`${VAR}`) nor multiline values nor
  `export ` prefixes. See [architecture.md](./architecture.md) for the exact rules.

## Related docs

- [architecture.md](./architecture.md) — load order and parsing, in depth.
- [Package README](../README.md)
- [Damat guide](../../../../docs/GUIDE.md)
