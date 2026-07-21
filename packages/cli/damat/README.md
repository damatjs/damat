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

For embedding a neutral command runtime, use `@damatjs/cli` directly. For
command behavior and package-level APIs, use the owning capability README.

See [composer internals](./docs/README.md) and the [Damat guide](../../../docs/GUIDE.md).
