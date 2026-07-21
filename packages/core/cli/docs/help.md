# Help and banner

Help and banner functions receive `CliOutput`. They never write to global
console state directly.

## Help

```ts
printDefaultHelp(config, commands, output);
printCommandSpecificHelp(config, command, output);
```

Default help includes usage, optional description and commands, help/version
options, and the `help <command>` hint. The verbose option appears only when
`config.verbose?.enabled === true`.

Command help includes the command description and either explicit `usage` or a
generated `<name> [options]` form. Options, examples, and subcommands are emitted
only when present.

The `help [command]` CAC action uses the invocation registry. It returns a
`CliRunResult`; an unknown target logs through `CliLogger` and returns code one.

## Banner

```ts
printBanner(config, output, bannerConfig);
```

Supported styles are `boxed`, `minimal`, and `none`. Title falls back to the CLI
name and subtitle falls back to the CLI description.

`runCli` renders a banner only when `config.banner` is an object. An omitted
banner produces no output. Consumers that want the boxed style configure it
explicitly:

```ts
banner: {
  style: "boxed",
  title: "My CLI",
  subtitle: "Build and development tools",
}
```
