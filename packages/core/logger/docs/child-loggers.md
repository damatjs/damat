# Child & prefixed loggers (and the no-op logger)

How context- and prefix-scoped loggers work. Covers `ChildLogger`
([`child.ts`](../src/child.ts)), the `child` / `withPrefix` factories on `Logger`
([`logger.ts`](../src/logger.ts)), and `NoopLogger` ([`noop.ts`](../src/noop.ts)). All
three classes implement the `ILogger` contract from
[`types.ts`](../src/types.ts).

## Responsibility

Let callers create lightweight, scoped views of a logger that automatically attach
shared context (e.g. `requestId`, `userId`) and/or a `[prefix]` tag to every line —
without re-implementing formatting or re-opening file transports.

## `Logger.child(context)` and `Logger.withPrefix(prefix)`

[`logger.ts`](../src/logger.ts):

```ts
child(context: LogContext): ILogger {
  return new ChildLogger(this, context, this.prefix);
}
withPrefix(prefix: string): ILogger {
  return new ChildLogger(this, {}, this.prefix ? `${this.prefix}:${prefix}` : prefix);
}
```

- `child` returns a `ChildLogger` bound to **this** `Logger`, carrying the given context
  and inheriting the parent's `prefix`.
- `withPrefix` returns a `ChildLogger` with empty added context and a prefix that nests
  under any existing prefix using `:` as the separator.

## `ChildLogger`

[`child.ts`](../src/child.ts). A `ChildLogger` holds three things: a reference to the
parent `Logger`, its accumulated `context`, and an optional `prefix`. It does **no**
formatting or I/O itself — every method forwards to the parent after merging context.

### Context merge

```ts
private merge(additional?: LogContext): LogContext {
  return { ...this.context, ...additional };
}
```

Per-call context is spread **after** the stored context, so a value passed at the call
site overrides the same key from the child's bound context.

### Chaining

- `child(context)` → a new `ChildLogger` whose context is `merge(context)` (parent
  context + new context), keeping the same prefix.
- `withPrefix(prefix)` → a new `ChildLogger` with the **same** context and a nested
  prefix (`existing:new`).

This means you can compose freely:

```ts
const base = logger.child({ service: "billing" });
const reqLog = base.child({ requestId: "req_1" }).withPrefix("charge");
reqLog.info("created", { amount: 500 });
// context seen by parent: { service: "billing", requestId: "req_1", amount: 500 }
// prefix: "charge" (or "<parentPrefix>:charge" if the root Logger had a prefix)
```

### Prefix routing

`ChildLogger` forwards every log call to the parent `Logger`'s `logWithPrefix(level,
message, prefix, context?, error?)` entry point, passing **its own** `prefix` as the
third argument:

```ts
debug(message, context?) {
  this.parent.logWithPrefix("debug", message, this.prefix, this.merge(context));
}
```

`Logger.logWithPrefix` then formats the entry with exactly that prefix, so a prefix set
via `ChildLogger.withPrefix()` (or inherited from a `Logger`-level `withPrefix`) appears
in the output. Formatting and file transport still happen once, inside the parent. The
parent's own private `log()` is just `logWithPrefix(level, msg, this.prefix, …)`, so a
root `Logger` uses its configured `prefix` while a child overrides it with the child's.

### `request()`

`ChildLogger.request(data)` simply delegates to `parent.request(data)` — request logging
is not context-merged through the child.

## `NoopLogger`

[`noop.ts`](../src/noop.ts) implements `ILogger` with empty method bodies — every log
call is discarded. It still tracks `context` and `prefixStack` so that `child()` and
`withPrefix()` return chainable no-op loggers (mirroring `ChildLogger`'s semantics):

```ts
child(context)    => new NoopLogger({ ...this.context, ...context }, this.prefixStack)
withPrefix(prefix) => new NoopLogger(this.context, this.prefixStack ? `${this.prefixStack}:${prefix}` : prefix)
```

A shared instance is exported as `NOOP_LOGGER`. Use it (or `new NoopLogger()`) to:

- Silence logging in tests.
- Provide a safe default in libraries that accept an optional `ILogger`.
- Back `createContextLogger()` when no global logger is configured (see
  [global.md](./global.md)).

## Performance notes

- Children are cheap: no transport, no formatter — just an object holding a parent ref
  and a context object.
- Merging allocates a new object per log call (`{ ...context, ...additional }`); for very
  hot paths prefer passing context once via `child()` rather than on every call.

## Safe extension

- When adding a new level method to `ILogger`/`Logger`, **also** add the forwarding stub
  to `ChildLogger` and the empty stub to `NoopLogger`, or the new method will be missing
  on scoped loggers and break the `ILogger` contract.
- Keep `merge()` order (`stored` then `additional`) so call-site overrides keep working.
