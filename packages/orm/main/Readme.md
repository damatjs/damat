# @daamat/framework

Core framework package for the Daamat system.

## Setup

This package uses [Bun](https://bun.sh) for dependency management and testing.

### Installation

```bash
bun install
```

### Scripts

- `bun test`: Run tests
- `bun run test:watch`: Run tests in watch mode
- `bun run build`: Compile TypeScript to JavaScript
- `bun run dev`: Run in development mode

## Usage

Import the framework core:

```typescript
import { initFramework } from "@daamat/framework";

initFramework();
```

## Testing

Tests are written using `bun:test`.

```typescript
import { describe, it, expect } from "bun:test";
```
