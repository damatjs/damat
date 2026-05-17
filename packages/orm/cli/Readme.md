# @damatjs/orm-cli

Unified CLI for DamatJS ORM codegen and migrations.

## Installation

```bash
bun add -g @damatjs/orm-cli
```

## Usage

```bash
damat-orm [command] [args...]
```

## Commands

### Generate

```bash
damat-orm generate types <module> [--types-dir <path>]
```

Generate TypeScript types from a module's schema.

### Migrate

```bash
damat-orm migrate up              # Run pending migrations
damat-orm migrate status [module] # Show migration status
damat-orm migrate list            # List modules with migrations
damat-orm migrate create <module> # Create a new migration
```

## Path Resolution

Paths are resolved in this order:

1. **CLI arguments** (highest priority)
2. **damat.config.ts**
3. **Defaults**

### Configuration (damat.config.ts)

```typescript
export default {
  modulesDir: "src/modules",
  modelsDir: "src/modules",       // Base path for models
  migrationsDir: "src/modules",   // Base path for migrations
  typesDir: "src/modules",        // Base path for generated types
};
```

### Default Paths

| Type | Default |
|------|---------|
| Models | `src/modules/{module}/models` |
| Migrations | `src/modules/{module}/migrations` |
| Types | `src/modules/{module}/types/common` |

## Environment

- `DATABASE_URL` - PostgreSQL connection string (required for migrations)

## Extending

```typescript
import { registerCommand, runCli, type Command } from "@damatjs/orm-cli";

const myCommand: Command = {
  name: "custom",
  description: "My custom command",
  handler: async (ctx) => {
    ctx.logger.info("Hello!");
    return { exitCode: 0 };
  },
};

registerCommand(myCommand);
await runCli();
```

## Architecture

```
src/
├── index.ts
├── bin.ts
└── cli/
    ├── index.ts           # CLI runner
    ├── types.ts           # Type definitions
    ├── registry.ts        # Command registry
    ├── config/            # Config loader
    ├── utils/paths/       # Path resolution
    └── commands/
        ├── generate/      # Generate commands
        └── migrate/       # Migration commands
```
