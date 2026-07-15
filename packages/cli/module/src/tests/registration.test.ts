import "./setup";
import { describe, expect, it } from "bun:test";
import {
  moduleCommand,
  moduleMigrationRunCommand,
  moduleMigrationStatusCommand,
} from "../commands/module";

describe("module subcommand registration", () => {
  it("registers all migration commands", () => {
    const names = (moduleCommand.subcommands ?? []).map(
      (command) => command.name,
    );
    expect(names).toContain("migration:create");
    expect(names).toContain("migration:run");
    expect(names).toContain("migration:status");
  });

  it("exports executable run and status commands", () => {
    expect(moduleMigrationRunCommand.name).toBe("migration:run");
    expect(typeof moduleMigrationRunCommand.handler).toBe("function");
    expect(moduleMigrationStatusCommand.name).toBe("migration:status");
    expect(typeof moduleMigrationStatusCommand.handler).toBe("function");
  });
});
