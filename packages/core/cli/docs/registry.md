# Command registry

`createCommandRegistry()` returns a new `CommandRegistryImpl`. There is no
module-level registry and no production reset operation.

```ts
const registry = createCommandRegistry();
registry.register(command);
registry.get("build");
registry.getAll();
registry.has("build");
registry.clear();
```

## Registration rules

- A command is stored under its `name`.
- Each alias points to the same command object.
- A child command is stored under `<parent>:<child>`.
- A child name that already includes its parent prefix is kept unchanged.
- A child alias is stored under `<parent>:<alias>`.
- Duplicate names and aliases throw `CommandRegistrationError`.
- `getAll()` deduplicates aliases and returns each command object once.

## Invocation ownership

`runCli` creates a registry, registers `config.commands`, and passes that
registry to help and dispatch code. Concurrent calls therefore operate on
different maps even when their command names overlap.

`clear()` remains part of `CommandRegistry` for callers that explicitly manage
a registry. `runCli` does not need it because invocation state is discarded when
the returned promise settles.
