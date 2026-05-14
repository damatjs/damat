# @damatjs/logger

A lightweight, zero-dependency, color-coded logger with optional file transport for Node.js/Bun.

## Features

- Color-coded console output with visual badges
- Log levels: `debug`, `info`, `warn`, `error`, `fatal`
- Formats: `pretty`, `json`, `simple`
- Child loggers with context inheritance
- Optional file logging (enabled via `LOGGING_FILE_ON=true`)
- Markdown format for human-readable logs
- Auto date-separated files (e.g., `2025-05-15_all.log`)
- File rotation when size limit reached

## Installation

```bash
bun add @damatjs/logger
```

## Usage

### Basic Usage

```typescript
import { createLogger } from "@damatjs/logger";

const logger = createLogger({ level: "debug" });

logger.info("Server started", { port: 3000 });
logger.warn("Rate limit approaching");
logger.error("Database error", new Error("Connection refused"));
```

### Global Logger

```typescript
import { info, warn, error, setGlobalLogger } from "@damatjs/logger";

info("Quick log");
warn("Warning message");
error("Failed", new Error("Something went wrong"));
```

### Child Loggers

```typescript
const requestLogger = logger.child({ requestId: "abc-123" });
requestLogger.info("Processing request");
```

### With Prefix

```typescript
const dbLogger = logger.withPrefix("database");
dbLogger.info("Connected");
// Output: [database] Connected
```

## Configuration

```typescript
interface LoggerConfig {
  level?: "debug" | "info" | "warn" | "error" | "fatal";
  format?: "json" | "pretty" | "simple";
  colors?: boolean;
  timestamp?: boolean;
  prefix?: string;
  file?: FileTransportConfig;
}
```

## File Logging (Optional)

Set environment variable to enable:

```bash
LOGGING_FILE_ON=true
```

### Generated Files

When enabled, creates:
- `logs/2025-05-15_all.log` - Machine-readable (.log)
- `logs/2025-05-15_all.md` - Human-readable (.md with emojis)

### Log File Format (.log)

```
[2025-05-15 10:30:45.123] [INFO] Server started {"port":3000}
[2025-05-15 10:30:46.456] [ERROR] Database error
  Error: Connection refused
  at Database.connect(...)
```

### Markdown File Format (.md)

```markdown
## ℹ️ INFO - 2025-05-15 10:30:45.123

**Message:** Server started

**Context:**
\`\`\`json
{ "port": 3000 }
\`\`\`

---

## ❌ ERROR - 2025-05-15 10:30:46.456

**Message:** Database error

**Error:** Error: Connection refused

\`\`\`
at Database.connect(...)
\`\`\`

---
```

## Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `LOGGING_FILE_ON` | `true`, `1` | Enable file logging |
| `NO_COLOR` | any | Disable colored output |
| `FORCE_COLOR` | any | Force colored output |

## Architecture

```
src/
├── types.ts          # Type definitions
├── colors.ts         # ANSI color codes & level styles
├── colorizer.ts      # Color formatting logic
├── formatter.ts      # Log entry formatting
├── file-transport.ts # File writing & rotation
├── logger.ts         # Main Logger class
├── child.ts          # Child logger implementation
├── global.ts         # Global logger & convenience functions
└── index.ts          # Public exports
```

## License

MIT
