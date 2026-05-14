# @damatjs/logger - Architecture

## Overview

This is a centralized logging package for the DamatJS framework. It provides color-coded console output with optional file-based logging for post-mortem analysis.

## Project Structure

```
packages/core/logger/
├── src/
│   ├── types.ts          - All TypeScript interfaces & types
│   ├── colors.ts         - ANSI escape codes, level styles, constants
│   ├── colorizer.ts      - Color detection & text formatting
│   ├── formatter.ts      - Log entry to string formatting
│   ├── file-transport.ts - File I/O, rotation, markdown generation
│   ├── logger.ts         - Main Logger class
│   ├── child.ts          - ChildLogger for context inheritance
│   ├── global.ts         - Singleton & convenience functions
│   └── index.ts          - Public API exports
├── README.md             - User documentation
└── package.json          - Package metadata
```

## Design Decisions

### Zero Dependencies
Uses Node.js built-in `fs` module for file operations and raw ANSI codes for colors. No external packages needed.

### File Transport as Optional Feature
File logging is disabled by default. Enable via environment variable:
- `LOGGING_FILE_ON=true` or `LOGGING_FILE_ON=1`

This keeps the logger lightweight for development while providing production-grade logging when needed.

### Dual Format Files
- `.log` files: Machine-readable, grep-friendly, structured
- `.md` files: Human-readable with emojis, perfect for quick analysis

### Date-Separated Files
Files are organized by date:
- `logs/2025-05-15_all.log`
- `logs/2025-05-15_all.md`

This makes log rotation and archival simple.

## Data Flow

```
User Code
    │
    ▼
Logger.log()
    │
    ├─► Console Output (always)
    │       │
    │       ▼
    │   Formatter.formatEntry()
    │       │
    │       ▼
    │   Colorizer (if TTY)
    │
    └─► FileTransport.log() (if LOGGING_FILE_ON=true)
            │
            ▼
        Buffer (1s default)
            │
            ▼
        flush() → Write to disk
```

## Key Types

```typescript
type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: { name: string; message: string; stack?: string };
}

interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  fatal(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): ILogger;
  withPrefix(prefix: string): ILogger;
}
```

## Color System

Colors auto-detect based on:
1. `NO_COLOR` env var → disabled
2. `FORCE_COLOR` env var → enabled
3. `process.stdout.isTTY` → enabled if TTY

Log level styles:
- `debug` → cyan, badge: ◯
- `info` → blue, badge: ●
- `warn` → yellow, badge: ▲
- `error` → red, badge: ✗
- `fatal` → red background, badge: ☠

## Updating Guide

### Adding a New Log Level

1. Update `LogLevel` type in `types.ts`
2. Add level style in `colors.ts` (color + badge + label)
3. Add numeric value in `LOG_LEVELS` constant
4. Add method to `ILogger` interface
5. Implement method in `Logger` class
6. Implement method in `ChildLogger` class

### Adding a New Output Format

1. Add format type to `LogFormat` in `types.ts`
2. Update `Formatter.formatEntry()` to handle new format

### Modifying File Output

Edit `file-transport.ts`:
- `formatLog()` for `.log` files
- `formatMd()` for `.md` files

### Changing Default Behavior

Edit constructor defaults in:
- `Logger` constructor for console logging
- `FileTransport` constructor for file logging

## Best Practices

1. Always call `logger.close()` on application shutdown
2. Use child loggers for request-scoped context
3. Use prefixes for module identification
4. Enable file logging in production environments
5. Configure log level via environment: `LOG_LEVEL=debug`
