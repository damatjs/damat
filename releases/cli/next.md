# @damatjs/cli Unreleased

> Subcommand argument parsing now understands `--no-<flag>` to negate a boolean
> option, matching how top-level commands already behave.

## What changed

Top-level commands are parsed by `cac`, which turns `--no-foo` into `foo: false`.
Subcommands (e.g. `damat module build`) are dispatched through this package's own
`parseCommandArgs`, which did **not** recognize the `--no-` prefix — so
`--no-typecheck` on a subcommand was silently ignored and the option kept its
default.

`parseCommandArgs` now negates a boolean option when given `--no-<name>`, so a
boolean option that defaults to `true` can be turned off on a subcommand the same
way it can on a top-level command.

```ts
// option: { name: "typecheck", type: "boolean", default: true }
parseCommandArgs(["--no-typecheck"], defs).options.typecheck; // -> false
```

## Added

- `--no-<name>` boolean negation in `parseCommandArgs` (`run/buildCommand.ts`).

## Changed / improved

- Subcommand boolean flags now behave consistently with top-level ones.

## Breaking

- None. `--no-<unknown>` is still ignored; only boolean options matching a
  defined name are negated.

## Action required

- None — drop-in. Subcommands can now expose `--no-<flag>` opt-outs for boolean
  options that default on.

## References

- Current behavior: [package README](../../packages/core/cli/README.md).
- Source: `packages/core/cli/src/run/buildCommand.ts`,
  `packages/core/cli/src/tests/parseCommandArgs.test.ts`.
