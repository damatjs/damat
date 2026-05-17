import { describe, it, expect, beforeEach } from "bun:test";
import { registerCommand, getCommand, getAllCommands, getRegistry } from "../cli/registry";
import type { Command, CommandResult } from "../cli/types";

describe("CommandRegistry", () => {
  beforeEach(() => {
    const registry = getRegistry();
    for (const cmd of registry.getAll()) {
      try {
        (registry as any).commands.delete(cmd.name);
      } catch { }
    }
  });

  it("registers and retrieves a command", () => {
    const testCommand: Command = {
      name: "test:command",
      description: "A test command",
      handler: async (): Promise<CommandResult> => ({ exitCode: 0 }),
    };

    registerCommand(testCommand);
    const retrieved = getCommand("test:command");

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("test:command");
    expect(retrieved?.description).toBe("A test command");
  });

  it("returns undefined for non-existent command", () => {
    const retrieved = getCommand("non:existent");
    expect(retrieved).toBeUndefined();
  });

  it("throws when registering duplicate command", () => {
    const command: Command = {
      name: "duplicate:test",
      description: "First registration",
      handler: async (): Promise<CommandResult> => ({ exitCode: 0 }),
    };

    registerCommand(command);

    expect(() => registerCommand(command)).toThrow("Command 'duplicate:test' is already registered");
  });

  it("getAll returns all registered commands", () => {
    const cmd1: Command = {
      name: "cmd:one",
      description: "Command one",
      handler: async (): Promise<CommandResult> => ({ exitCode: 0 }),
    };
    const cmd2: Command = {
      name: "cmd:two",
      description: "Command two",
      handler: async (): Promise<CommandResult> => ({ exitCode: 0 }),
    };

    registerCommand(cmd1);
    registerCommand(cmd2);

    const all = getAllCommands();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some((c) => c.name === "cmd:one")).toBe(true);
    expect(all.some((c) => c.name === "cmd:two")).toBe(true);
  });

  it("has returns true for registered command", () => {
    const command: Command = {
      name: "exists:check",
      description: "Check existence",
      handler: async (): Promise<CommandResult> => ({ exitCode: 0 }),
    };

    registerCommand(command);

    const registry = getRegistry();
    expect(registry.has("exists:check")).toBe(true);
    expect(registry.has("not:registered")).toBe(false);
  });
});
