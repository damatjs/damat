// Import setup first so filesystem/environment mocks exist before command
// evaluation. Process spawning is resolved from Bun when each command runs.
import { state, writeCalls, mockMkdirSync, resetMocks } from "./setup";
import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { createContext } from "./helpers";
import type { Command } from "@damatjs/cli";

/**
 * dev.handler writes a temp entry file, optionally clears the console, loads
 * env vars and spawns `bun --watch`. The global fakes (recording Bun.spawn
 * dispatcher + node:fs + @damatjs/load-env mocks) live in ./setup; per-test
 * behaviour is driven by mutating the shared `state` and reading the shared
 * recording arrays.
 */

// Import the source AFTER setup installed the fakes (setup is imported first
// above). This binds `devCommand` for the assertions below.
const { devCommand } = (await import("../commands/dev")) as {
  devCommand: Command;
};

const CWD = "/project";
let clearSpy: ReturnType<typeof spyOn>;

// Preserve/restore the process.env values we mutate.
const savedNodeEnv = process.env.NODE_ENV;
const savedPort = process.env.PORT;

beforeEach(() => {
  resetMocks();
  // dev.handler reads process.env.PORT/NODE_ENV; start each test from a clean
  // slate so per-test sets/deletes below are the only influence.
  delete process.env.PORT;
  delete process.env.NODE_ENV;
  clearSpy = spyOn(console, "clear").mockImplementation(() => {});
});

afterEach(() => {
  clearSpy.mockRestore();
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
  if (savedPort === undefined) delete process.env.PORT;
  else process.env.PORT = savedPort;
});

describe("devCommand.handler", () => {
  it("writes the dev-entry temp file with framework runEntry content", async () => {
    state.existsDefault = false;
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    const write = writeCalls.find((w) =>
      w.path.endsWith("/.damat/dev-entry.ts"),
    );
    expect(write).toBeDefined();
    expect(write!.content).toBe(
      `import { runEntry } from '@damatjs/framework/entry';\nrunEntry();\n`,
    );
  });

  it("creates the .damat dir when missing", async () => {
    state.existsDefault = false;
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(mockMkdirSync).toHaveBeenCalledWith("/project/.damat", {
      recursive: true,
    });
  });

  it("does not clear the console when clear is false", async () => {
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });
    await devCommand.handler(ctx);
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it("clears the console when clear is true", async () => {
    const { ctx } = createContext({ port: 3000, clear: true }, { cwd: CWD });
    await devCommand.handler(ctx);
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
