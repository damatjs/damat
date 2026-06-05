import { describe, it, expect } from "bun:test";
import migrateCommand from "../cli/commands/migrate/index";
import migrateCreate from "../cli/commands/migrate/create";
import migrateList from "../cli/commands/migrate/list";
import type { CommandContext } from "@damatjs/cli";

function createMockLogger() {
  return {
    error: (...args: any[]) => {},
    info: (...args: any[]) => {},
    success: (...args: any[]) => {},
    warn: (...args: any[]) => {},
    skip: (...args: any[]) => {},
  };
}

function createMockContext(
  args: string[] = [],
  options: any = {},
): CommandContext {
  return {
    command: "migrate",
    args,
    options: {
      config: {},
      verbose: false,
      ...options,
    },
    logger: createMockLogger() as any,
    cwd: process.cwd(),
  };
}

describe("migrate composite command", () => {
  it("has correct name and description", () => {
    expect(migrateCommand.name).toBe("migrate");
    expect(migrateCommand.description).toBe("Database migration commands");
  });

  it("returns exitCode 0 when called", async () => {
    const ctx = createMockContext([]);
    const result = await migrateCommand.handler(ctx);
    expect(result.exitCode).toBe(0);
  });
});

describe("migrate:list command", () => {
  it("has correct name and description", () => {
    expect(migrateList.name).toBe("migrate:list");
    expect(migrateList.description).toContain("List");
  });

  it("returns exitCode 1 when no damat.config.ts is present", async () => {
    // The CLI always loads damat.config.ts from ctx.cwd; the test runner's
    // cwd has no config file, so the command should exit with 1.
    const ctx = createMockContext([]);
    const result = await migrateList.handler(ctx);
    expect(result.exitCode).toBe(1);
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
