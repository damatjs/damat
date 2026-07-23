# @damatjs/damat-cli

The `damat` executable is the user-facing composer for Damat CLI capabilities.
It owns process input, the Damat logger, the banner, fatal-error handling, and
the final command order. Command implementations live in focused packages.

## Install

```bash
bun add -d @damatjs/damat-cli
bun damat --help
```

## Capability ownership

| Package                | Commands                                   |
| ---------------------- | ------------------------------------------ |
| `@damatjs/cli-app`     | `create`, `clone`, `dev`, `start`, `build` |
| `@damatjs/cli-codegen` | `codegen`, `barrel`                        |
| `@damatjs/cli-module`  | `module`, `auth`                           |
| `@damatjs/cli-kit`     | `kit`                                      |

The executable preserves this top-level order: `create`, `clone`, `dev`,
`start`, `build`, `codegen`, `barrel`, `module`, `kit`, `auth`.

App and module builds use each target project's installed TypeScript compiler
through `bun run tsc --noEmit`. Application codegen leaves the optional
`pg-cloudflare` transport external while loading `damat.config.ts`, so consumer
projects do not need a direct dependency for codegen.

For embedding a neutral command runtime, use `@damatjs/cli` directly. For
command behavior and package-level APIs, use the owning capability README.

`--verbose` is global and may appear before or after a command path:

```bash
damat --verbose module dev
damat module dev --verbose
```

Both forms pass verbose mode to module command error handling and print one
handled-error summary followed by the underlying stack. Without the flag,
failures retain the concise retry hint.

See [composer internals](./docs/README.md) and the [Damat guide](../../../docs/GUIDE.md).
