import { describe, it, expect } from "bun:test";
import * as pkgIndex from "../index";
import * as cliIndex from "../cli/index";
import allCommands, {
  databaseSetupCommand,
  migrateCommand,
} from "../cli/commands/index";

describe("package public API (src/index.ts)", () => {
  it("re-exports CLI and database setup helpers", () => {
    expect(typeof pkgIndex.runCli).toBe("function");
    expect(typeof pkgIndex.loadModules).toBe("function");
    expect(typeof pkgIndex.requireDatabaseUrl).toBe("function");
    expect(typeof pkgIndex.ensurePostgresDatabase).toBe("function");
  });
});

describe("cli barrel (src/cli/index.ts)", () => {
  it("re-exports runCli", () => {
    expect(typeof cliIndex.runCli).toBe("function");
  });
});

describe("command aggregation (src/cli/commands/index.ts)", () => {
  it("default export contains database setup and migrate commands", () => {
    expect(Array.isArray(allCommands)).toBe(true);
    expect(allCommands.length).toBe(2);
    const names = allCommands.map((c) => c.name).sort();
    expect(names).toEqual(["database:setup", "migrate"]);
  });

  it("named exports match the aggregated commands", () => {
    expect(allCommands).toContain(migrateCommand);
    expect(allCommands).toContain(databaseSetupCommand);
  });
});

describe("command tree structure", () => {
  it("migrate exposes up/status/list/create subcommands", () => {
    const subs = migrateCommand.subcommands ?? [];
    expect(subs.map((s) => s.name).sort()).toEqual([
      "migrate:create",
      "migrate:list",
      "migrate:status",
      "migrate:up",
    ]);
  });

  it("migrate:status declares a --module string option with alias m", () => {
    const status = (migrateCommand.subcommands ?? []).find(
      (s) => s.name === "migrate:status",
    );
    expect(status).toBeDefined();
    const opt = (status!.options ?? []).find((o) => o.name === "module");
    expect(opt).toBeDefined();
    expect(opt!.alias).toBe("m");
    expect(opt!.type).toBe("string");
  });
});
