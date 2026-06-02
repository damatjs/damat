import { describe, it, expect } from "bun:test";
import generateCommand from "../cli/commands/generate/index";
import generateTypesCmd from "../cli/commands/generate/types";
import type { CommandContext } from "@damatjs/cli";

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
    command: "generate",
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

describe("generate composite command", () => {
  it("has correct name and description", () => {
    expect(generateCommand.name).toBe("generate");
    expect(generateCommand.description).toBe("Code generation commands");
  });

  it("returns exitCode 0 when called", async () => {
    const ctx = createMockContext([]);
    const result = await generateCommand.handler(ctx);
    expect(result.exitCode).toBe(0);
  });
});

describe("generate:types command", () => {
  it("has correct name and description", () => {
    expect(generateTypesCmd.name).toBe("generate:types");
    expect(generateTypesCmd.description).toContain("Generate TypeScript types");
  });

  it("returns exitCode 1 when module name missing", async () => {
    const ctx = createMockContext([]);
    const result = await generateTypesCmd.handler(ctx);
    expect(result.exitCode).toBe(1);
  });

  it("returns exitCode 1 when models directory not found", async () => {
    const ctx = createMockContext(["nonexistent_module"]);
    const result = await generateTypesCmd.handler(ctx);
    expect(result.exitCode).toBe(1);
  });
});
