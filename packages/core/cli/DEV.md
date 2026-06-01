# Development Guide

This guide is for contributors and maintainers of `@damatjs/cli`.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Making Changes](#making-changes)
- [Release Process](#release-process)
- [Design Decisions](#design-decisions)

---

## Architecture Overview

`@damatjs/cli` is a general-purpose CLI framework built on top of `cac` for argument parsing. It provides:

1. **Command Registry Pattern** - Singleton registry for managing commands
2. **Built-in Argument Parsing** - Using `cac` internally, consumers get clean typed data
3. **Config Loading** - Optional file-based configuration with caching
4. **Help Generation** - Automatic help with customization hooks
5. **Logger Integration** - Uses `@damatjs/logger` for consistent logging

### High-Level Flow

```
runCli(config)
  │
  ├─► Initialize CAC instance
  │
  ├─► Register global options (--help, --version, --verbose)
  │
  ├─► Register commands from config
  │    ├─► Register command with CAC
  │    ├─► Register options
  │    └─► Register subcommands
  │
  ├─► Parse process.argv
  │
  ├─► Match command
  │    ├─► Validate options
  │    ├─► Load config (if configured)
  │    ├─► Build CommandContext
  │    └─► Execute handler
  │
  └─► Handle errors / exit
```

---

## Project Structure

```
packages/core/cli/
├── src/
│   ├── index.ts              # Public API exports
│   ├── run.ts                # Main runCli() function
│   ├── registry.ts           # Command registry (singleton)
│   ├── types.ts              # TypeScript type definitions
│   ├── config.ts             # Config file loading
│   ├── help.ts               # Help generation
│   ├── errors.ts             # Custom error classes
│   ├── utils/
│   │   ├── banner.ts         # Banner printing utilities
│   │   ├── output.ts         # Console output helpers
│   │   └── validate.ts       # Option validation/coercion
│   └── tests/
│       ├── registry.test.ts  # Registry tests
│       ├── validate.test.ts  # Validation tests
│       ├── config.test.ts    # Config tests
│       ├── banner.test.ts    # Banner tests
│       ├── help.test.ts      # Help tests
│       └── errors.test.ts    # Error tests
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
├── README.md                 # User documentation
├── CHANGELOG.md              # Version history
└── DEV.md                    # This file
```

---

## Core Components

### 1. run.ts - Main Entry Point

The `runCli()` function is the heart of the package:

**Responsibilities:**
- Validate CLI config
- Initialize CAC instance
- Register all commands and options
- Parse arguments
- Route to command handlers
- Handle errors

**Key Functions:**
- `runCli(config)` - Main entry
- `registerSingleCommand(cli, cmd, config, logger)` - Register one command
- `resolveCommandName(args)` - Extract command from argv
- `buildCommandContext(...)` - Build typed context for handlers

**When modifying:**
- Be careful with the order of operations (register → parse → handle)
- Ensure proper error handling around handler execution
- Test thoroughly with various argument combinations

### 2. registry.ts - Command Registry

Singleton registry that stores and retrieves commands.

**Responsibilities:**
- Store commands in a Map
- Handle command aliases
- Handle subcommand registration
- Prevent duplicate registrations

**API:**
```typescript
getRegistry(): CommandRegistry
registerCommand(command: Command): void
getCommand(name: string): Command | undefined
getAllCommands(): Command[]
clearRegistry(): void
```

**When modifying:**
- Ensure thread-safety (currently single-threaded, but good to keep in mind)
- Test alias handling thoroughly
- Make sure subcommand registration doesn't create duplicates

### 3. types.ts - Type Definitions

All TypeScript types for the package.

**Key Types:**
- `CliConfig` - Main configuration
- `Command` - Command definition
- `CommandContext` - Context passed to handlers
- `CommandOption` - Option definition
- `CommandResult` - Return type from handlers

**When modifying:**
- Keep backwards compatibility when possible
- Add new fields as optional
- Update README.md documentation

### 4. config.ts - Config Loading

File-based configuration loading with caching.

**Features:**
- Supports TypeScript, JSON, and custom formats
- Caches loaded configs
- Custom loader support
- Multiple file fallback

**API:**
```typescript
loadConfig<T>(loader?: ConfigLoader, cwd?: string): Promise<T | null>
clearConfigCache(): void
withConfig<T>(loader): { get, clear }
```

**When modifying:**
- Test with various file formats
- Be careful with cache invalidation
- Handle import errors gracefully

### 5. help.ts - Help Generation

Automatic help generation with customization hooks.

**Features:**
- Default boxed format
- Command listing
- Option documentation
- Examples display
- Custom template support

**API:**
```typescript
printDefaultHelp(config: CliConfig, commands: Command[]): void
printCommandSpecificHelp(config: CliConfig, command: Command): void
```

**When modifying:**
- Test with various command configurations
- Ensure alignment/formatting is correct
- Test with and without options/examples/aliases

### 6. errors.ts - Error Classes

Custom error classes for CLI-specific errors.

**Classes:**
- `CliError` - Base error class
- `CommandNotFoundError` - Unknown command
- `MissingRequiredOptionError` - Required option not provided
- `ConfigLoadError` - Config file issues
- `CommandRegistrationError` - Registry issues

**When modifying:**
- Keep messages user-friendly
- Include all relevant context
- Ensure exitCode is appropriate

### 7. utils/ - Utility Modules

**banner.ts:**
- Prints startup banner
- Three styles: boxed, minimal, none
- Customizable title/subtitle

**output.ts:**
- Console output formatting helpers
- Section printing
- Error/success/info formatting

**validate.ts:**
- Option validation
- Type coercion (string/number/boolean)
- Default value application

---

## Development Setup

### Prerequisites

- Bun >= 1.1.0
- Node.js (for compatibility testing)

### Setup

```bash
# From repo root
bun install

# Build the package
cd packages/core/cli
bun run build

# Run tests
bun test

# Watch mode for development
bun run watch
```

### Dependencies

**Production:**
- `cac` - Argument parser
- `@damatjs/logger` - Logging

**Dev:**
- `@damatjs/typescript-config` - Shared TS config
- `@types/bun` - Type definitions
- `typescript`

---

## Testing

### Test Structure

Tests are in `src/tests/`. Each file tests one module:

- `registry.test.ts` - Command registry
- `validate.test.ts` - Option validation/coercion
- `config.test.ts` - Config loading
- `banner.test.ts` - Banner printing
- `help.test.ts` - Help generation
- `errors.test.ts` - Error classes

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/tests/registry.test.ts

# Run with coverage (if configured)
bun test --coverage
```

### Writing Tests

Use Bun's test API:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";

describe("My feature", () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  test("should do something", () => {
    // Test code
    expect(result).toBe(expected);
  });
});
```

### Test Guidelines

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up side effects (file system, console, etc.)
3. **Coverage**: Test edge cases, not just happy paths
4. **Readability**: Use descriptive test names

### Console Mocking

For testing functions that use `console.log`:

```typescript
describe("Console output", () => {
  let output: string[] = [];
  let originalLog: typeof console.log;

  beforeEach(() => {
    output = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      output.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("should output correctly", () => {
    myFunction();
    expect(output.join("\n")).toContain("expected text");
  });
});
```

### Config File Testing

Use temp directories:

```typescript
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});
```

---

## Making Changes

### Before You Start

1. Check existing issues/PRs
2. Discuss major changes in an issue first
3. Ensure you have the latest main branch

### Development Workflow

1. **Create a branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes:**
   - Edit source files
   - Update types if needed
   - Add/update tests

3. **Build:**
   ```bash
   bun run build
   ```

4. **Test:**
   ```bash
   bun test
   ```

5. **Check TypeScript:**
   ```bash
   bun tsc --noEmit
   ```

6. **Update documentation:**
   - Update README.md for user-facing changes
   - Update this file for internal changes
   - Add CHANGELOG.md entry

### Code Style

- No comments unless absolutely necessary
- Follow existing patterns
- Use TypeScript strict mode
- Prefer functional style over classes (except registry)
- Export from index.ts

### Adding a New Feature

1. **Define types** in `types.ts`
2. **Implement logic** in appropriate module
3. **Export from index.ts** if public
4. **Add tests** in `tests/`
5. **Document in README.md**

### Adding a New Command Option Type

1. Add type to `CommandOption.type` union
2. Update `coerceOptionValue()` in `utils/validate.ts`
3. Add tests for coercion
4. Update documentation

### Adding a New Error Class

1. Add class in `errors.ts` extending `CliError`
2. Add descriptive message
3. Set appropriate exitCode
4. Add test in `errors.test.ts`
5. Export from index.ts

---

## Release Process

### Versioning

We follow [SemVer](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features, backwards compatible
- PATCH: Bug fixes

### Updating Version

1. **Update package.json version:**
   ```json
   { "version": "0.1.0" }
   ```

2. **Update CHANGELOG.md:**
   ```markdown
   ## 0.1.0
   
   ### Added
   - New feature description
   
   ### Fixed
   - Bug fix description
   ```

3. **Commit:**
   ```bash
   git add .
   git commit -m "chore: release v0.1.0"
   ```

4. **Tag:**
   ```bash
   git tag v0.1.0
   ```

5. **Build and test:**
   ```bash
   bun run build
   bun test
   ```

6. **Publish** (if you have permissions):
   ```bash
   bun publish
   ```

---

## Design Decisions

### Why CAC?

- Lightweight (< 3KB minified)
- Zero dependencies
- TypeScript support
- Familiar API (similar to commander/yargs)
- Used by popular projects (Vite, etc.)

### Why Singleton Registry?

- Commands are defined once at startup
- Shared state across the CLI
- Prevents duplicate registrations
- Simple API (no need to pass registry around)

### Why Not Export CAC?

- We control the API surface
- Can switch parser later without breaking changes
- Consumers get clean, typed data
- Less coupling to CAC specifics

### Verbose Mode Auto-Handling

The `--verbose` flag automatically adjusts logger level:
- `handler: "auto"` (default) - CLI framework handles it
- `handler: "manual"` - Handler receives verbose flag, handles it itself

Reason: Most CLIs want this behavior by default, but some need custom handling.

### Config Caching

Config is loaded once and cached:
- Improves performance for multiple command dispatch
- Avoids repeated file reads/imports
- Cache can be cleared with `clearConfigCache()`

### No Middleware/Hooks System

Kept simple for first version. Can add later if needed:
- beforeCommand / afterCommand hooks
- Command middleware chains
- Global command wrappers

### Type Coercion Strategy

Options are coerced based on their `type`:
- `string`: Always converted to string
- `number`: Converted via `Number()`, returns NaN-safe
- `boolean`: Converted via `Boolean()`
- `undefined` (default): Minimal coercion

Reason: Command handlers should receive typed data, not strings.

### Subcommands Two Ways

Both nested definition and free-form naming supported because:
- Nested is cleaner for grouped commands
- Free-form is flexible for dynamic registration
- Both resolve to the same handler call

---

## Troubleshooting

### Common Issues

**Build fails:**
- Check TypeScript version
- Run `rm -rf node_modules && bun install`
- Check for type errors in new code

**Tests fail:**
- Check console output
- Ensure no missing cleanup (files, mocks)
- Run individual test file for isolation

**Import errors:**
- Check `exports` in package.json
- Ensure proper `.js` extension in imports
- Check TypeScript module resolution

### Debug Mode

Set `DEBUG=1` environment variable for verbose logging during development.

---

## Future Enhancements

Potential improvements for future versions:

1. **Autocompletion** - Generate shell completion scripts
2. **Plugin System** - Allow third-party plugins
3. **Middleware** - before/after command hooks
4. **Interactive Mode** - REPL-like interface
5. **Better Error Messages** - Suggestions for typos
6. **Watch Mode** - Re-run commands on file changes
7. **Progress Reporting** - Built-in progress bars
8. **Output Formatting** - Table, list, tree views

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and build
5. Submit a pull request

### Pull Request Checklist

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Documentation updated (README.md)
- [ ] CHANGELOG.md updated
- [ ] No unnecessary comments in code
- [ ] Follows existing code patterns

---

## Support

For questions or issues:
- Open a GitHub issue
- Check existing issues/PRs first
- Provide minimal reproduction

---

Thank you for contributing to `@damatjs/cli`!
