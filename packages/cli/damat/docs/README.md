# Damat CLI composer internals

`src/capabilities.ts` composes the app, codegen, module, kit, and auth
capabilities. `src/cli.ts` passes that ordered command list to `runCli`.
`src/runtime.ts` is the only Damat-specific runtime adapter: it reads process
state, creates the logger, and writes output to the console.

The composer must not import framework, module, codegen-core, link, environment,
or ORM implementation packages. Those dependencies belong to the capability
that owns the command.

Compatibility tests assert command order, representative aliases/options, help
composition, runtime defaults, and console output.
