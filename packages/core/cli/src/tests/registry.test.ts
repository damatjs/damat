import { describe, expect, test } from "bun:test";
import { createCommandRegistry } from "../registry";
import type { Command } from "../types";

function command(name: string, overrides: Partial<Command> = {}): Command {
  return {
    name,
    description: `${name} command`,
    handler: async () => ({ exitCode: 0 }),
    ...overrides,
  };
}

describe("CommandRegistry", () => {
  test("registers commands, aliases, and unique command values", () => {
    const registry = createCommandRegistry();
    const build = command("build", { aliases: ["b"] });
    registry.register(build);

    expect(registry.get("build")).toBe(build);
    expect(registry.get("b")).toBe(build);
    expect(registry.getAll()).toEqual([build]);
    expect(registry.has("build")).toBe(true);
    expect(registry.get("missing")).toBeUndefined();
  });

  test("namespaces nested commands and aliases", () => {
    const registry = createCommandRegistry();
    const up = command("up", { aliases: ["u"] });
    registry.register(command("db", { subcommands: [up] }));

    expect(registry.get("db:up")).toBe(up);
    expect(registry.get("db:u")).toBe(up);
  });

  test("keeps an already-prefixed nested command name", () => {
    const registry = createCommandRegistry();
    const up = command("db:up");
    registry.register(command("db", { subcommands: [up] }));
    expect(registry.get("db:up")).toBe(up);
  });

  test("rejects duplicate commands and aliases", () => {
    const registry = createCommandRegistry();
    registry.register(command("build", { aliases: ["b"] }));

    expect(() => registry.register(command("build"))).toThrow(
      "command already registered",
    );
    expect(() =>
      registry.register(command("test", { aliases: ["b"] })),
    ).toThrow("alias 'b' already registered");
  });

  test("clear removes every registration", () => {
    const registry = createCommandRegistry();
    registry.register(command("build"));
    registry.clear();
    expect(registry.getAll()).toEqual([]);
  });
});
