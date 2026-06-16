[Damat Guide](../GUIDE.md) › Logging

# 11. Logging

[`@damatjs/logger`](../../packages/core/logger/README.md) is a structured logger
with levels (`debug`/`info`/`success`/`warn`/`error`/`fatal`/`skip`), formats
(`json`/`pretty`/`simple`), child/prefixed loggers, and optional file transport.
Configure it via `projectConfig.loggerConfig` (see
[Configuration](./04-configuration.md)); access it through the global helpers or a
child logger:

```ts
import { getGlobalLogger } from "@damatjs/logger";
const log = getGlobalLogger().child({ requestId });
log.info("user created", { userId });
```

---

Prev: [← Redis](./10-redis.md) · [Guide home](../GUIDE.md) · Next: [The default backend →](./12-default-backend.md)
