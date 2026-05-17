import { describe, it, expect, beforeEach } from "bun:test";
import { registerAllCommands, generateCommand, migrateCommand } from "../cli/commands/index";
import { getCommand, getAllCommands, getRegistry } from "../cli/registry";

describe("registerAllCommands", () => {
  beforeEach(() => {
    const registry = getRegistry();
    for (const cmd of registry.getAll()) {
      try {
        (registry as any).commands.delete(cmd.name);
      } catch {}
    }
  });

  it("registers all commands", () => {
    registerAllCommands();

    const allCommands = getAllCommands();
    expect(allCommands.length).toBeGreaterThanOrEqual(2);
  });

  it("registers generate command", () => {
    registerAllCommands();
    const cmd = getCommand("generate");
    expect(cmd).toBeDefined();
    expect(cmd?.name).toBe("generate");
  });

  it("registers migrate command", () => {
    registerAllCommands();
    const cmd = getCommand("migrate");
    expect(cmd).toBeDefined();
    expect(cmd?.name).toBe("migrate");
  });
});

describe("command exports", () => {
  it("generateCommand has correct structure", () => {
    expect(generateCommand.name).toBe("generate");
    expect(generateCommand.description).toBe("Code generation commands");
    expect(typeof generateCommand.handler).toBe("function");
  });

  it("migrateCommand has correct structure", () => {
    expect(migrateCommand.name).toBe("migrate");
    expect(migrateCommand.description).toBe("Database migration commands");
    expect(typeof migrateCommand.handler).toBe("function");
  });
});
