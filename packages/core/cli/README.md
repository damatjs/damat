# @damatjs/cli

General-purpose CLI framework for DamatJS projects.

## Features

- Built-in argument parsing with `cac`
- Command registry with subcommand support
- Optional config file loading
- Customizable help and banner
- TypeScript-first with strong typing
- Integrated with `@damatjs/logger`

## Installation

```bash
bun add @damatjs/cli
```

## Quick Start

```typescript
import { runCli } from "@damatjs/cli";

runCli({
  name: "my-cli",
  version: "1.0.0",
  description: "My awesome CLI",
  commands: [
    {
      name: "hello",
      description: "Say hello",
      options: [
        { name: "name", type: "string", default: "World" }
      ],
      handler: async (ctx) => {
        console.log(`Hello, ${ctx.options.name}!`);
        return { exitCode: 0 };
      }
    }
  ]
});
```

## Command Definition

```typescript
import type { Command } from "@damatjs/cli";

const command: Command = {
  name: "build",
  description: "Build the project",
  aliases: ["b"],
  options: [
    {
      name: "output",
      alias: "o",
      type: "string",
      description: "Output directory",
      default: "dist"
    },
    {
      name: "minify",
      type: "boolean",
      description: "Minify output",
      default: false
    }
  ],
  handler: async (ctx) => {
    const output = ctx.options.output as string;
    const minify = ctx.options.minify as boolean;
    // Your logic here
    return { exitCode: 0 };
  }
};
```

## Subcommands

Two ways to define subcommands:

### Nested Definition

```typescript
{
  name: "migrate",
  description: "Database migrations",
  subcommands: [
    { name: "migrate:up", description: "Run migrations", handler: ... },
    { name: "migrate:down", description: "Rollback migrations", handler: ... }
  ]
}
```

### Free-form Naming

```typescript
[
  { name: "migrate:up", description: "Run migrations", handler: ... },
  { name: "migrate:down", description: "Rollback migrations", handler: ... }
]
```

## Config Loading

```typescript
runCli({
  name: "my-cli",
  version: "1.0.0",
  configLoader: {
    file: "my.config.ts" // or ["my.config.ts", ".myrc"]
  },
  commands: [...]
});

// In handler, access via:
const config = ctx.options.config;
```

## Help Customization

```typescript
runCli({
  name: "my-cli",
  version: "1.0.0",
  helpTemplate: (config, commands) => {
    return `Custom help for ${config.name}`;
  },
  commands: [...]
});
```

## Banner

```typescript
runCli({
  name: "my-cli",
  version: "1.0.0",
  banner: {
    title: "My CLI",
    subtitle: "Build amazing things",
    style: "boxed" // or "minimal" or "none"
  },
  commands: [...]
});
```

## Verbose Mode

Enabled by default with `--verbose` flag. Automatically sets logger to debug level.

```typescript
runCli({
  name: "my-cli",
  version: "1.0.0",
  verbose: {
    enabled: true,   // default
    handler: "auto"  // "auto" or "manual"
  },
  commands: [...]
});
```

## Error Handling

```typescript
runCli({
  name: "my-cli",
  version: "1.0.0",
  onError: (error, ctx) => {
    // Custom error handling
    console.error("Custom error:", error.message);
  },
  commands: [...]
});
```

## API

### Exports

- `runCli(config)` - Start the CLI
- `getRegistry()` - Get command registry
- `registerCommand(cmd)` - Register a command
- `loadConfig(loader)` - Load config file
- `printDefaultHelp(config, commands)` - Print help
- `printBanner(config, bannerConfig)` - Print banner

### Types

- `CliConfig`
- `Command`
- `CommandContext`
- `CommandResult`
- `CommandOption`
- `CommandRegistry`
- `ConfigLoader`
- `BannerConfig`

## License

MIT
