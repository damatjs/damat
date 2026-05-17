import { describe, it, expect } from "bun:test";
import migrateCommand, { migrateComposite } from "../cli/commands/migrate/index";
import migrateCreate from "../cli/commands/migrate/create";
import migrateList from "../cli/commands/migrate/list";
import type { CommandContext } from "../cli/types";

function createMockLogger() {
  return {
    error: (...args: any[]) => { },
    info: (...args: any[]) => { },
    success: (...args: any[]) => { },
    warn: (...args: any[]) => { },
    skip: (...args: any[]) => { },
  };
}

function createMockContext(args: string[] = [], options: any = {}): CommandContext {
  return {
    args,
    options: {
      config: {},
      verbose: false,
      ...options,
    },
    logger: createMockLogger() as any,
  };
}

describe("migrate composite command", () => {
  it("has correct name and description", () => {
    expect(migrateCommand.name).toBe("migrate");
    expect(migrateCommand.description).toBe("Database migration commands");
  });

  it("returns exitCode 0 for help subcommand", async () => {
    const ctx = createMockContext(["help"]);
    const result = await migrateComposite.handler(ctx);
    expect(result.exitCode).toBe(0);
  });

  it("returns exitCode 0 for --help flag", async () => {
    const ctx = createMockContext(["--help"]);
    const result = await migrateComposite.handler(ctx);
    expect(result.exitCode).toBe(0);
  });

  it("returns exitCode 0 when no args provided", async () => {
    const ctx = createMockContext([]);
    const result = await migrateComposite.handler(ctx);
    expect(result.exitCode).toBe(0);
  });

  it("returns exitCode 1 for unknown subcommand", async () => {
    const ctx = createMockContext(["unknown"]);
    const result = await migrateComposite.handler(ctx);
    expect(result.exitCode).toBe(1);
  });

  it("passes args to subcommand", async () => {
    const ctx = createMockContext(["list", "extra", "args"]);
    const result = await migrateComposite.handler(ctx);
    expect(result.exitCode).toBe(0);
  });
});

describe("migrate:list command", () => {
  it("has correct name and description", () => {
    expect(migrateList.name).toBe("migrate:list");
    expect(migrateList.description).toContain("List");
  });

  it("returns exitCode 0 on success", async () => {
    const ctx = createMockContext([]);
    const result = await migrateList.handler(ctx);
    expect(result.exitCode).toBe(0);
  });
});

describe("migrate:create command", () => {
  it("has correct name and description", () => {
    expect(migrateCreate.name).toBe("migrate:create");
    expect(migrateCreate.description).toContain("Create");
  });

  it("returns exitCode 1 when module name missing", async () => {
    const ctx = createMockContext([]);
    const result = await migrateCreate.handler(ctx);
    expect(result.exitCode).toBe(1);
  });

  it("returns exitCode 1 when models directory not found", async () => {
    const ctx = createMockContext(["nonexistent_module"]);
    const result = await migrateCreate.handler(ctx);
    expect(result.exitCode).toBe(1);
  });
});
