# @damatjs/load-env

> Minimal, zero-dependency `.env` loader for Damat apps.

`@damatjs/load-env` reads environment variables from `.env` files and writes them into
`process.env`. It walks a small, environment-aware cascade
(`.env` → `.env.local` → `.env.{environment}` → `.env.{environment}.local`), parses each
file that exists with a hand-rolled parser, and merges them — later files in the cascade
override earlier ones, while any variable already present in `process.env` is never
overwritten, so real system/process environment variables always win. It is used at app
startup (e.g. by the `damat` CLI) before config is read.

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/load-env
```

Inside the monorepo it is consumed as a workspace package — depend on it with `"*"`:

```json
{
  "dependencies": {
    "@damatjs/load-env": "*"
  }
}
```

## When to use

Use it when you want:

- A tiny, dependency-free way to load `.env` files at process start.
- Environment-specific overrides (`.env.development`, `.env.production`, plus `.local`
  variants) without pulling in a heavier loader.
- "System env wins" semantics — variables already present in `process.env` are never
  overwritten.

Skip it when:

- You need variable interpolation/expansion (`${OTHER_VAR}`), multiline values, or
  `export` syntax — this parser does not support them. Reach for `dotenv` /
  `dotenv-expand` (available via `@damatjs/deps`).

## Quick start

```ts
import { loadEnv } from "@damatjs/load-env";

// Call once, as early as possible — before reading process.env elsewhere.
loadEnv(process.env.NODE_ENV ?? "development", process.cwd());

// Now downstream code can read the loaded values:
const dbUrl = process.env.DATABASE_URL;
```

Both arguments are optional: `loadEnv()` defaults `environment` to `"development"` and
`cwd` to `process.cwd()`.

## API

The single entry point `@damatjs/load-env` exports `loadEnv`.

| Export    | Kind | Summary                                                                             |
| --------- | ---- | ----------------------------------------------------------------------------------- |
| `loadEnv` | fn   | Read the `.env` cascade in `cwd` and merge it into `process.env` (non-overwriting). |

Signature:

```ts
function loadEnv(
  environment?: string /* = "development" */,
  cwd?: string /* = process.cwd() */,
): void;
```

The parser, `parseEnvFile(content: string): Record<string, string>`, is an internal
detail used by `loadEnv` and is **not** re-exported from the entry point.

No subpath exports — the package ships a single `.` entry.

## How it fits

**Dependencies:** none (uses only Node's built-in `node:fs` and `node:path`).

**In-repo dependents** (depend on `@damatjs/load-env` via `"*"`):

- `damat` CLI (`packages/cli/damat`)

> Trust each consumer's `package.json` for the current wiring.

## Documentation

- [Internals & maintainer docs](./docs/README.md) — load order, parsing rules, and the
  cascade merge behavior in detail ([architecture](./docs/architecture.md)).
- [Full Damat guide](../../../docs/GUIDE.md)

## License

MIT
