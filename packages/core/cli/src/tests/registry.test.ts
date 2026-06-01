import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getRegistry, clearRegistry, registerCommand, getCommand, getAllCommands } from "../registry";
import type { Command } from "../types";

describe("CommandRegistry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  test("should register and retrieve a command", () => {
    const cmd: Command = {
      name: "test",
      description: "Test command",
      handler: async () => ({ exitCode: 0 }),
    };

    registerCommand(cmd);
    const retrieved = getCommand("test");

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("test");
    expect(retrieved?.description).toBe("Test command");
  });

  test("should return undefined for non-existent command", () => {
    const retrieved = getCommand("nonexistent");
    expect(retrieved).toBeUndefined();
  });

  test("should get all registered commands", () => {
    const cmd1: Command = {
      name: "test1",
      description: "Test 1",
      handler: async () => ({ exitCode: 0 }),
    };
    const cmd2: Command = {
      name: "test2",
      description: "Test 2",
      handler: async () => ({ exitCode: 0 }),
    };

    registerCommand(cmd1);
    registerCommand(cmd2);

    const all = getAllCommands();
    expect(all.length).toBe(2);
    expect(all.map(c => c.name)).toContain("test1");
    expect(all.map(c => c.name)).toContain("test2");
  });

  test("should register command with aliases", () => {
    const cmd: Command = {
      name: "build",
      description: "Build command",
      aliases: ["b", "bld"],
      handler: async () => ({ exitCode: 0 }),
    };

    registerCommand(cmd);

    expect(getCommand("build")).toBeDefined();
    expect(getCommand("b")).toBeDefined();
    expect(getCommand("bld")).toBeDefined();
  });

  test("should throw when registering duplicate command", () => {
    const cmd: Command = {
      name: "duplicate",
      description: "Duplicate",
      handler: async () => ({ exitCode: 0 }),
    };

    registerCommand(cmd);

    expect(() => registerCommand(cmd)).toThrow();
  });

  test("should register subcommands", () => {
    const parent: Command = {
      name: "migrate",
      description: "Migration commands",
      subcommands: [
        {
          name: "migrate:up",
          description: "Run migrations",
          handler: async () => ({ exitCode: 0 }),
        },
        {
          name: "migrate:down",
          description: "Rollback migrations",
          handler: async () => ({ exitCode: 0 }),
        },
      ],
      handler: async () => ({ exitCode: 0 }),
    };

    registerCommand(parent);

    expect(getCommand("migrate")).toBeDefined();
    expect(getCommand("migrate:up")).toBeDefined();
    expect(getCommand("migrate:down")).toBeDefined();
  });

  test("should check if command exists", () => {
    const registry = getRegistry();
    const cmd: Command = {
      name: "exists",
      description: "Exists command",
      handler: async () => ({ exitCode: 0 }),
    };

    expect(registry.has("exists")).toBe(false);
    registerCommand(cmd);
    expect(registry.has("exists")).toBe(true);
  });

  test("should clear all commands", () => {
    const cmd: Command = {
      name: "clear-test",
      description: "Clear test",
      handler: async () => ({ exitCode: 0 }),
    };

    registerCommand(cmd);
    expect(getCommand("clear-test")).toBeDefined();

    clearRegistry();
    expect(getCommand("clear-test")).toBeUndefined();
  });

  test("should not duplicate commands in getAll", () => {
    const cmd: Command = {
      name: "alias-test",
      description: "Alias test",
      aliases: ["at"],
      handler: async () => ({ exitCode: 0 }),
    };

    registerCommand(cmd);

    const all = getAllCommands();
    const names = all.map(c => c.name);
    expect(names.filter(n => n === "alias-test").length).toBe(1);
  });
});
