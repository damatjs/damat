import { describe, it, expect } from "bun:test";
import { generateCommand, migrateCommand } from "../cli/commands/index";

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
