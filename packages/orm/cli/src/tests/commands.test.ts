import { describe, it, expect } from "bun:test";
import { migrateCommand } from "../cli/commands/index";

describe("command exports", () => {
  it("migrateCommand has correct structure", () => {
    expect(migrateCommand.name).toBe("migrate");
    expect(migrateCommand.description).toBe("Database migration commands");
    expect(typeof migrateCommand.handler).toBe("function");
  });
});
