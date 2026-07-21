# @damatjs/cli internals

`@damatjs/cli` is a framework-neutral command runtime over `cac`. A call to
`runCli` receives or creates a `CliRuntime`, builds an invocation-owned registry
and optional project-config state, parses the supplied arguments, runs one
shared execution pipeline, and returns a `CliRunResult`.

## Module map

| Area                  | Responsibility                                                      | Detail                                                 |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/types/`          | Definition, command, runtime, logger, output, and result contracts. | [command-model.md](./command-model.md)                 |
| `src/runtime/`        | Process-backed neutral defaults.                                    | [run.md](./run.md)                                     |
| `src/registry/`       | Registry implementation and isolated factory.                       | [registry.md](./registry.md)                           |
| `src/capability/`     | Capability definition and ordered composition.                      | [command-model.md](./command-model.md)                 |
| `src/testing/`        | In-memory standalone capability test harness.                       | [command-model.md](./command-model.md)                 |
| `src/config/`         | One-shot loading and accessor-local caching.                        | [run.md](./run.md)                                     |
| `src/run/`            | Parser construction, manual routing, shared execution, and results. | [run.md](./run.md)                                     |
| `src/help/`           | Default and command-specific help writers.                          | [help.md](./help.md)                                   |
| `src/utils/banner.ts` | Boxed, minimal, and disabled banner rendering.                      | [help.md](./help.md)                                   |
| `src/utils/output/`   | Neutral output/error helpers.                                       | [output-and-validation.md](./output-and-validation.md) |
| `src/utils/validate/` | Defaults, coercion, and required-option validation.                 | [output-and-validation.md](./output-and-validation.md) |

## Invocation flow

```text
CliDefinition + Partial<CliRuntime>
              |
         createRuntime
              |
   registry + optional config accessor
              |
      presentation policy
              |
 manual default/subcommand routing or CAC leaf routing
              |
         runCommand
              |
        executeCommand
              |
         CliRunResult
```

Both manual and CAC routing reach `runCommand` and `executeCommand`, so option
coercion, defaults, validation, config injection, verbose behavior, `onError`,
and exit-code mapping stay consistent.

## Invariants

- Core never calls `process.exit` or assigns `process.exitCode`.
- Only `src/runtime/` reads process defaults.
- A registry belongs to exactly one invocation; a config accessor exists only
  when that invocation opts into project configuration.
- Help, banners, hints, and spacing use `CliOutput`.
- Core contains no Damat environment-variable or logger dependency.
- Banner and verbose presentation are opt-in.
- Code files remain at or below 100 physical lines.

## Detail docs

- [Command model](./command-model.md)
- [Run loop, parsing, and config](./run.md)
- [Registry](./registry.md)
- [Help and banner](./help.md)
- [Output and validation](./output-and-validation.md)
