# @damatjs/cli-app Unreleased

> Extracts application lifecycle commands into an independently composable
> capability.

## What changed

`create`, `clone`, `dev`, `start`, and `build` no longer belong to the Damat
executable package. They are exported with a stable command order from
`@damatjs/cli-app` and can run in any CLI built on `@damatjs/cli`.

Configuration remains optional. A command reads a Damat config only when its
operation requires one.

## Breaking

- None for `damat` users; the executable composes this capability.

## Action required

Custom CLIs can add `appCliCapability` to their capability list.

## References

- Current behavior: [package README](../../packages/cli/app/README.md)
- Source: `packages/cli/app/src/`
