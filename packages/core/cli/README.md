# @damatjs/cli

A general-purpose CLI framework for building command-line tools in the DamatJS ecosystem. Provides built-in argument parsing, command registry, config loading, and customizable help/banner output.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [Commands](#commands)
  - [Options](#options)
  - [Subcommands](#subcommands)
- [Configuration](#configuration)
  - [CLI Configuration](#cli-configuration)
  - [Config File Loading](#config-file-loading)
- [Customization](#customization)
  - [Banner](#banner)
  - [Help Output](#help-output)
  - [Error Handling](#error-handling)
- [API Reference](#api-reference)
- [Examples](#examples)
- [License](#license)

---

## Installation

```bash
bun add @damatjs/cli
```

---

## Quick Start

Create a simple CLI with one command:

```typescript
// bin.ts
import { runCli } from "@damatjs/cli";

runCli({
  name: "my-cli",
  version: "1.0.0",
  description: "My awesome CLI tool",
  commands: [
    {
      name: "hello",
      description: "Say hello to someone",
      options: [
        {
          name: "name",
          alias: "n",
          type: "string",
          description: "Name to greet",
          default: "World"
        },
        {
          name: "loud",
          type: "boolean",
          description: "Shout the greeting",
          default: false
        }
      ],
      handler: async (ctx) => {
        const name = ctx.options.name as string;
        const loud = ctx.options.loud as boolean;
        
        const message = loud 
          ? `HELLO, ${name.toUpperCase()}!` 
          : `Hello, ${name}!`;
        
        ctx.logger.info(message);
        return { exitCode: 0 };
      }
    }
  ]
});
```

Run it:

```bash
bun bin.ts hello --name Alice
bun bin.ts hello -n Bob
bun bin.ts hello --loud
bun bin.ts hello --help
```

---

## Core Concepts

### Commands

Commands are the core of your CLI. Each command has:

```typescript
interface Command {
  name: string;              // Command name (required)
  description: string;       // Short description (required)
  aliases?: string[];        // Alternative names
  usage?: string;           // Custom usage string
  examples?: string[];      // Example commands
  options?: CommandOption[]; // Command options
  subcommands?: Command[];  // Nested commands
  handler: (ctx) => Promise<CommandResult>; // Handler function
}
```

Example:

```typescript
const buildCommand: Command = {
  name: "build",
  description: "Build the project for production",
  aliases: ["b", "bld"],
  usage: "build [options]",
  examples: [
    "my-cli build",
    "my-cli build --output=dist",
    "my-cli build --minify"
  ],
  options: [...],
  handler: async (ctx) => {
    // Your build logic
    return { exitCode: 0 };
  }
};
```

### Options

Options are flags and parameters for commands:

```typescript
interface CommandOption {
  name: string;              // Option name (required)
  alias?: string;            // Short flag (e.g., 'o' for -o)
  description: string;       // Help text (required)
  type?: "string" | "boolean" | "number"; // Value type
  default?: unknown;         // Default value
  required?: boolean;        // Make option required
}
```

Examples:

```typescript
// String option
{ name: "output", alias: "o", type: "string", description: "Output directory", default: "dist" }

// Number option
{ name: "port", alias: "p", type: "number", description: "Port number", default: 3000 }

// Boolean flag
{ name: "minify", type: "boolean", description: "Minify output", default: false }

// Required option
{ name: "input", type: "string", description: "Input file", required: true }
```

### Subcommands

Two approaches for subcommands:

#### Approach 1: Nested Definition

Best for grouping related commands:

```typescript
{
  name: "migrate",
  description: "Database migration commands",
  subcommands: [
    {
      name: "migrate:up",
      description: "Run all pending migrations",
      handler: async (ctx) => {
        // Run migrations up
        return { exitCode: 0 };
      }
    },
    {
      name: "migrate:down",
      description: "Rollback last migration",
      handler: async (ctx) => {
        // Rollback
        return { exitCode: 0 };
      }
    },
    {
      name: "migrate:status",
      description: "Show migration status",
      handler: async (ctx) => {
        // Show status
        return { exitCode: 0 };
      }
    }
  ],
  handler: async (ctx) => {
    // Default behavior when no subcommand
    return { exitCode: 0 };
  }
}
```

Usage:

```bash
my-cli migrate up
my-cli migrate down
my-cli migrate status
```

#### Approach 2: Free-form Naming

Commands with colons in the name:

```typescript
[
  { name: "migrate:up", description: "Run migrations", handler: ... },
  { name: "migrate:down", description: "Rollback", handler: ... },
  { name: "migrate:status", description: "Status", handler: ... }
]
```

Both approaches work. The handler receives clean, typed data regardless of the approach.

---

## Configuration

### CLI Configuration

The main `CliConfig` object:

```typescript
interface CliConfig {
  name: string;              // CLI name (required)
  version: string;           // CLI version (required)
  description?: string;      // Short description
  commands: Command[];       // Array of commands (required)
  banner?: BannerConfig | false; // Banner config
  helpTemplate?: Function;   // Custom help template
  verbose?: VerboseConfig;   // Verbose mode config
  configLoader?: ConfigLoader; // Config file loader
  onError?: Function;        // Error handler
}
```

Complete example:

```typescript
runCli({
  name: "my-cli",
  version: "2.0.0",
  description: "A production-ready CLI tool",
  commands: [...],
  banner: {
    title: "My CLI",
    subtitle: "v2.0.0",
    style: "boxed"
  },
  verbose: {
    enabled: true,
    handler: "auto"
  },
  configLoader: {
    file: ["my.config.ts", ".myrc.json"]
  },
  onError: (error, ctx) => {
    console.error(`Error: ${error.message}`);
  }
});
```

### Config File Loading

Load configuration from files:

```typescript
runCli({
  name: "my-cli",
  version: "1.0.0",
  configLoader: {
    file: "my.config.ts"  // Single file
  },
  commands: [...]
});

// Or multiple files (tries in order):
runCli({
  configLoader: {
    file: ["my.config.ts", ".myrc", "my.config.json"]
  },
  ...
});
```

Example `my.config.ts`:

```typescript
export default {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
};
```

Access in handler:

```typescript
handler: async (ctx) => {
  const config = ctx.options.config as {
    apiUrl: string;
    timeout: number;
    retries: number;
  };
  
  console.log(config.apiUrl);
  return { exitCode: 0 };
}
```

Custom loader:

```typescript
configLoader: {
  file: "custom.config",
  load: async (filePath) => {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  }
}
```

---

## Customization

### Banner

Three styles: `boxed`, `minimal`, `none`.

#### Boxed (default)

```typescript
runCli({
  banner: {
    style: "boxed"
  }
});
```

Output:

```
┌────────────────────────────────────────────────────────────┐
│  my-cli                                                    │
├────────────────────────────────────────────────────────────┤
│  A production-ready CLI tool                               │
└────────────────────────────────────────────────────────────┘
```

#### Minimal

```typescript
runCli({
  banner: {
    style: "minimal"
  }
});
```

Output:

```
my-cli

A production-ready CLI tool
```

#### None

```typescript
runCli({
  banner: false
});
```

No banner output.

#### Custom Title/Subtitle

```typescript
runCli({
  name: "my-cli",
  banner: {
    title: "My Awesome CLI",
    subtitle: "Build amazing things faster",
    style: "boxed"
  }
});
```

### Help Output

Default help is automatically generated. Override with custom template:

```typescript
runCli({
  helpTemplate: (config, commands) => {
    let output = `\n${config.name} v${config.version}\n\n`;
    output += `Usage: ${config.name} <command>\n\n`;
    output += `Commands:\n`;
    
    for (const cmd of commands) {
      output += `  ${cmd.name.padEnd(15)} ${cmd.description}\n`;
    }
    
    return output;
  }
});
```

### Error Handling

Custom error handler:

```typescript
runCli({
  onError: (error, ctx) => {
    if (error instanceof MissingRequiredOptionError) {
      console.error(`Missing required option: ${error.message}`);
    } else {
      console.error(`Unexpected error: ${error.message}`);
      if (ctx.options.verbose) {
        console.error(error.stack);
      }
    }
  }
});
```

---

## API Reference

### Main Functions

```typescript
// Start the CLI
runCli(config: CliConfig): Promise<void>

// Registry functions
getRegistry(): CommandRegistry
registerCommand(command: Command): void
getCommand(name: string): Command | undefined
getAllCommands(): Command[]

// Config loading
loadConfig<T>(loader?: ConfigLoader, cwd?: string): Promise<T | null>
clearConfigCache(): void

// Help printing
printDefaultHelp(config: CliConfig, commands: Command[]): void
printCommandSpecificHelp(config: CliConfig, command: Command): void

// Banner printing
printBanner(config: CliConfig, banner?: BannerConfig): void
```

### Types

```typescript
// Main types
CliConfig
Command
CommandContext
CommandResult
CommandOption
CommandRegistry

// Configuration types
ConfigLoader
BannerConfig
VerboseConfig

// Error types
CliError
CommandNotFoundError
MissingRequiredOptionError
ConfigLoadError
CommandRegistrationError
```

### CommandContext

Received by every handler:

```typescript
interface CommandContext {
  command: string;              // Resolved command name
  args: string[];               // Positional arguments
  options: Record<string, unknown>; // Parsed options
  logger: ILogger;              // Logger instance
  cwd: string;                  // Current working directory
}
```

Usage:

```typescript
handler: async (ctx) => {
  const commandName = ctx.command;        // "build"
  const args = ctx.args;                   // ["src", "dist"]
  const options = ctx.options;            // { output: "dist", minify: true }
  const logger = ctx.logger;              // ILogger instance
  const cwd = ctx.cwd;                    // "/path/to/project"
  
  // If config loaded
  const config = ctx.options.config;      // Loaded config object
  
  return { exitCode: 0 };
}
```

---

## Examples

### Example 1: Build Tool CLI

```typescript
import { runCli } from "@damatjs/cli";

runCli({
  name: "builder",
  version: "1.0.0",
  description: "A modern build tool",
  commands: [
    {
      name: "build",
      description: "Build for production",
      aliases: ["b"],
      options: [
        { name: "output", alias: "o", type: "string", default: "dist" },
        { name: "minify", type: "boolean", default: true },
        { name: "sourcemap", type: "boolean", default: false }
      ],
      handler: async (ctx) => {
        const output = ctx.options.output as string;
        ctx.logger.info(`Building to ${output}...`);
        // Build logic
        return { exitCode: 0 };
      }
    },
    {
      name: "dev",
      description: "Start development server",
      aliases: ["serve", "s"],
      options: [
        { name: "port", alias: "p", type: "number", default: 3000 },
        { name: "open", type: "boolean", default: false }
      ],
      handler: async (ctx) => {
        const port = ctx.options.port as number;
        ctx.logger.info(`Starting dev server on port ${port}...`);
        // Start server
        return { exitCode: 0 };
      }
    }
  ]
});
```

### Example 2: Database CLI with Subcommands

```typescript
import { runCli, type Command } from "@damatjs/cli";

const migrateUp: Command = {
  name: "migrate:up",
  description: "Run pending migrations",
  handler: async (ctx) => {
    ctx.logger.info("Running migrations...");
    return { exitCode: 0 };
  }
};

const migrateDown: Command = {
  name: "migrate:down",
  description: "Rollback migrations",
  options: [
    { name: "steps", type: "number", default: 1, description: "Steps to rollback" }
  ],
  handler: async (ctx) => {
    const steps = ctx.options.steps as number;
    ctx.logger.info(`Rolling back ${steps} migration(s)...`);
    return { exitCode: 0 };
  }
};

runCli({
  name: "db-tool",
  version: "1.0.0",
  description: "Database management CLI",
  configLoader: {
    file: "db.config.ts"
  },
  commands: [
    {
      name: "migrate",
      description: "Migration commands",
      subcommands: [migrateUp, migrateDown]
    },
    {
      name: "seed",
      description: "Seed the database",
      handler: async (ctx) => {
        ctx.logger.info("Seeding database...");
        return { exitCode: 0 };
      }
    }
  ]
});
```

### Example 3: Project Generator CLI

```typescript
import { runCli } from "@damatjs/cli";
import { prompts } from "@clack/prompts";

runCli({
  name: "create-app",
  version: "1.0.0",
  description: "Create a new project from templates",
  commands: [
    {
      name: "create",
      description: "Create a new project",
      aliases: ["init", "new"],
      options: [
        { name: "template", alias: "t", type: "string", description: "Template name" },
        { name: "name", type: "string", description: "Project name", required: true },
        { name: "install", type: "boolean", default: true, description: "Install dependencies" }
      ],
      handler: async (ctx) => {
        const projectName = ctx.options.name as string;
        const template = ctx.options.template as string | undefined;
        const install = ctx.options.install as boolean;
        
        ctx.logger.info(`Creating project: ${projectName}`);
        
        if (template) {
          ctx.logger.info(`Using template: ${template}`);
        }
        
        // Project creation logic
        
        if (install) {
          ctx.logger.info("Installing dependencies...");
        }
        
        ctx.logger.success("Project created successfully!");
        return { exitCode: 0 };
      }
    }
  ],
  banner: {
    title: "Create App",
    subtitle: "Scaffold new projects instantly",
    style: "boxed"
  }
});
```

---

## Global Options

Every CLI built with `@damatjs/cli` includes these options by default:

- `--help, -h` - Show help
- `--version, -v` - Show version
- `--verbose` - Enable verbose output (if not disabled)

Verbose mode automatically logs at debug level using the `@damatjs/logger` integration.

Example:

```bash
my-cli --help
my-cli --version
my-cli build --verbose
```

---

## License

MIT © Abel Lamesgen
