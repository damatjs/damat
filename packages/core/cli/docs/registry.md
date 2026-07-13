# Command registry

Covers `src/registry/` (`command.ts` — `CommandRegistryImpl`; `index.ts` — singleton + helpers).

## Responsibility

Store commands by name, resolve aliases, recursively register subcommands under a namespaced key, and prevent duplicate registrations. There is exactly one registry per process (a module-level singleton), so commands defined anywhere are visible everywhere.

## Singleton + helpers — `src/registry/index.ts`

```ts
function getRegistry(): CommandRegistry; // lazily constructs the singleton
function registerCommand(command: Command): void;
function getCommand(name: string): Command | undefined;
function getAllCommands(): Command[];
function clearRegistry(): void; // clears + drops the instance
```

`getRegistry()` builds a `CommandRegistryImpl` on first use and reuses it after. `clearRegistry()` empties the map **and** nulls the instance — `runCli` calls it at the top of every run so state never leaks between invocations or tests.

## `CommandRegistryImpl` — `src/registry/command.ts`

Backed by a single `Map<string, Command>` that holds both canonical names and aliases.

### `register(command, prefix = "")`

The namespacing rule is the heart of this file:

```ts
const name =
  prefix && !command.name.startsWith(`${prefix}:`)
    ? `${prefix}:${command.name}` // namespace under the parent
    : command.name; // already prefixed, or no prefix → as-is
```

Then:

1. Throw `CommandRegistrationError` if `name` is already registered.
2. Store `name → command`.
3. For each alias: key is `prefix ? `${prefix}:${alias}` : alias`. Throw if that alias key collides; otherwise store it pointing at the same command.
4. For each subcommand: recurse with `prefix = name` (the just-computed full name).

Consequences:

- A subcommand can be written either way and lands at the same key. Under parent `migrate`:
  - `{ name: "up" }` → stored as `migrate:up`
  - `{ name: "migrate:up" }` → starts with `migrate:` → kept as `migrate:up`
- Top-level `dev` and a subcommand `module:dev` never collide because the latter is keyed `module:dev`.
- Aliases live in the same map as names, so `getCommand(alias)` returns the command, and an alias that duplicates an existing key throws.

### `get` / `has`

Direct map lookups (`O(1)`), matching either a canonical name or an alias key.

### `getAll()`

Dedupes by `command.name` (not by map key), so a command stored under both its name and several aliases appears **once**:

```ts
const seen = new Set<string>();
for (const cmd of this.commands.values())
  if (!seen.has(cmd.name)) {
    seen.add(cmd.name);
    unique.push(cmd);
  }
```

Note dedup is by the command's own `name` field — subcommands appear as their own entries (e.g. `migrate:up`) because their `name` differs from the parent's. The parent also appears (it's registered under its bare name).

### `clear()`

`this.commands.clear()` — used by the singleton's `clearRegistry`.

## How `runCli` uses it

```ts
clearRegistry();
for (const cmd of config.commands) getRegistry().register(cmd);   // recursive: subs + aliases
for (const cmd of getRegistry().getAll()) registerSingleCommand(cli, cmd, ...); // skips parents w/ subcommands
```

So registration is the single source of truth; the run loop iterates `getAll()` to mirror leaf commands into cac and relies on `get("parent:child")` during manual subcommand dispatch.

## Gotchas

- **Duplicate names/aliases throw at registration**, surfacing as `CommandRegistrationError` (a `CliError`, exitCode 1). This happens during `runCli` setup, before parsing.
- **`getAll()` includes parents and subcommands** as separate entries. The run loop's `registerSingleCommand` is what skips parents (those with `subcommands`) from cac registration — the registry itself does not filter them.
- **Single shared namespace** — because it's a process singleton, two independent `runCli` calls in one process would clash without the `clearRegistry()` reset; that reset is why repeated runs/tests work.

## Safe extension

- Keep alias keys and name keys in the same map only if you preserve the `getAll()` dedup-by-`name` behavior; help/listing relies on no duplicates.
- If you add deeper nesting, the recursive `register(sub, name)` already supports arbitrary depth (`a:b:c`) — just ensure subcommand `name`s don't accidentally start with an unrelated prefix.
