# Logger Utility

## Overview

The logger is a structured logging utility located in `packages/utils/src/logger/`. It provides configurable log levels, JSON/pretty formatting, and child loggers with persistent context.

## File Structure

```
packages/utils/src/logger/
├── index.ts        # Re-exports + createLogger factory
├── types.ts        # Type definitions
├── config.ts       # Zod schema + loadConfig
├── logger.ts       # Main Logger class
├── data.ts         # Log levels Data
└── childLogger.ts  # ChildLogger class
```

## Setup & Usage

### 1. Initialize Logger (once at app startup)

```typescript
import { createLogger, schema, loadConfig } from "@damatjs/utils";

// Load config from environment variables
const rawConfig = loadConfig(process.env);
const config = schema.parse(rawConfig);

// Create and export logger instance
export const logger = createLogger(config);
```

### 2. Environment Variables

| Variable     | Values                           | Default |
| ------------ | -------------------------------- | ------- |
| `LOG_LEVEL`  | `debug`, `info`, `warn`, `error` | `info`  |
| `LOG_FORMAT` | `json`, `pretty`                 | `json`  |

### 3. Using the Logger

```typescript
import { logger } from "./path-to-your-logger";

// Basic logging
logger.debug("Debug message", { key: "value" });
logger.info("Info message", { userId: "123" });
logger.warn("Warning message");
logger.error("Error message", new Error("Something failed"), {
  context: "data",
});

// Request logging (auto-determines level from status code)
logger.request({
  requestId: "req-123",
  method: "GET",
  path: "/api/users",
  status: 200,
  duration: 45,
  userId: "user-123",
});

// Child logger with persistent context
const childLogger = logger.child({ service: "auth", requestId: "req-456" });
childLogger.info("User logged in"); // Includes service & requestId automatically
```

## API Reference

### `createLogger(config: LoggerConfig): Logger`

Factory function to create a logger instance.

### `schema`

Zod schema for validating logger config. Provides defaults.

### `loadConfig(env: NodeJS.ProcessEnv)`

Extracts `LOG_LEVEL` and `LOG_FORMAT` from environment.

### Logger Methods

| Method    | Signature                                                        |
| --------- | ---------------------------------------------------------------- |
| `debug`   | `(message: string, context?: LogContext) => void`                |
| `info`    | `(message: string, context?: LogContext) => void`                |
| `warn`    | `(message: string, context?: LogContext) => void`                |
| `error`   | `(message: string, error?: Error, context?: LogContext) => void` |
| `request` | `(data: RequestData) => void`                                    |
| `child`   | `(context: LogContext) => ChildLogger`                           |

## Types

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";
type LogFormat = "json" | "pretty";

interface LogContext {
  [key: string]: unknown;
}

interface LoggerConfig {
  logLevel: LogLevel;
  logFormat: LogFormat;
}
```
