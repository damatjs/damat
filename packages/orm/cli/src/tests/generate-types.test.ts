import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
} from "bun:test";
import fs from "node:fs";
import path from "node:path";

/**
 * Full-behavior tests for the `generate:types` handler.
 *
 * Strategy:
 *  - Config loading uses the REAL `loadModules` against throwaway temp
 *    `damat.config.ts` files (no database, no real project). This avoids
 *    mocking `@/cli/utils/load`, which is process-global in Bun and would leak
 *    into the dedicated load.test.ts suite.
 *  - The external ORM packages (orm-migration, orm-model, orm-codegen) ARE
 *    replaced with `mock.module`. They are only ever exercised by this handler,
 *    so the global mock does not affect the other suites (whose code paths bail
 *    out before importing them).
 *  - Filesystem writes are real, into the temp dir, so we can assert the exact
 *    output files.
 */

const tempBase = path.join(process.cwd(), ".test-gen-types-temp");

// A fresh, uniquely-named cwd per test. The handler hardcodes the config name
// "damat.config.ts", and src/cli/utils/load.ts cache-busts imports only at
// millisecond resolution, so a unique directory per test guarantees a unique
// file URL (and therefore no stale module cache hits).
let tempRoot = tempBase;
let counter = 0;

type State = {
  discoverModels: any[];
  discoverModelsArg: unknown;
  discoverThrows: Error | null;
  toModuleSchemaArgs: { name: string; models: unknown } | null;
  filesMap: Map<string, string>;
  generateFilesMapArgs: { schema: unknown; opts: unknown; logger: unknown } | null;
  generateThrows: Error | null;
};

const state: State = {
  discoverModels: [],
  discoverModelsArg: undefined,
  discoverThrows: null,
  toModuleSchemaArgs: null,
  filesMap: new Map(),
  generateFilesMapArgs: null,
  generateThrows: null,
};

mock.module("@damatjs/orm-migration", () => ({
  discoverModels: async (arg: unknown) => {
    state.discoverModelsArg = arg;
    if (state.discoverThrows) throw state.discoverThrows;
    return state.discoverModels;
  },
}));

mock.module("@damatjs/orm-model", () => ({
  toModuleSchema: (name: string, models: unknown) => {
    state.toModuleSchemaArgs = { name, models };
    return { name, tables: [] };
  },
}));

mock.module("@damatjs/orm-codegen", () => ({
  generateFilesMap: (schema: unknown, opts: unknown, logger: unknown) => {
    state.generateFilesMapArgs = { schema, opts, logger };
    if (state.generateThrows) throw state.generateThrows;
    return state.filesMap;
  },
}));

function createLogger() {
  const calls: Array<{ level: string; msg: string }> = [];
  const make = (level: string) => (msg: string) =>
    calls.push({ level, msg: String(msg) });
  return {
    calls,
    logger: {
      info: make("info"),
      error: make("error"),
      success: make("success"),
      warn: make("warn"),
      skip: make("skip"),
    },
  };
}

/**
 * Writes a real damat.config.ts into the temp root describing the given modules.
 * `modules` maps a module name to its (relative or absolute) resolve path.
 */
function writeConfig(modules: Record<string, string>) {
  const entries = Object.entries(modules)
    .map(([name, resolve]) => `${name}: { resolve: ${JSON.stringify(resolve)} }`)
    .join(",\n");
  fs.writeFileSync(
    path.join(tempRoot, "damat.config.ts"),
    `export default { projectConfig: {}, modules: { ${entries} } };`,
    "utf-8",
  );
}

function ctxFor(args: string[]) {
  const { calls, logger } = createLogger();
  const ctx: any = {
    command: "generate:types",
    args,
    options: {},
    logger,
    cwd: tempRoot,
  };
  return { ctx, calls };
}

async function getCmd() {
  return (await import("../cli/commands/generate/types")).default;
}

const hasLog = (
  calls: Array<{ level: string; msg: string }>,
  level: string,
  re: RegExp,
) => calls.some((c) => c.level === level && re.test(c.msg));

beforeEach(() => {
  tempRoot = path.join(tempBase, `t${counter++}`);
  fs.mkdirSync(tempRoot, { recursive: true });
  state.discoverModels = [];
  state.discoverModelsArg = undefined;
  state.discoverThrows = null;
  state.toModuleSchemaArgs = null;
  state.filesMap = new Map();
  state.generateFilesMapArgs = null;
  state.generateThrows = null;
});

afterEach(() => {
  if (fs.existsSync(tempBase)) {
    fs.rmSync(tempBase, { recursive: true, force: true });
  }
});

describe("generate:types - guard branches", () => {
  it("returns exit 1 and logs an error when no module name is provided", async () => {
    const cmd = await getCmd();
    const { ctx, calls } = ctxFor([]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Module name is required/)).toBe(true);
  });

  it("returns exit 1 when the config file is missing (load failure)", async () => {
    // No damat.config.ts written -> real loadModules throws.
    const cmd = await getCmd();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Failed to load config:/)).toBe(true);
  });

  it("returns exit 1 when the config has no modules", async () => {
    fs.writeFileSync(
      path.join(tempRoot, "damat.config.ts"),
      `export default { projectConfig: {}, modules: {} };`,
    );
    const cmd = await getCmd();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /No modules found/)).toBe(true);
  });

  it("returns exit 1 when the requested module is not in the config", async () => {
    const otherResolve = path.join(tempRoot, "modules", "other");
    fs.mkdirSync(otherResolve, { recursive: true });
    writeConfig({ other: otherResolve });
    const cmd = await getCmd();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Module 'user' not found in config/)).toBe(true);
  });

  it("returns exit 1 when the models directory does not exist", async () => {
    const resolve = path.join(tempRoot, "modules", "user");
    fs.mkdirSync(resolve, { recursive: true }); // module dir exists, models/ does not
    writeConfig({ user: resolve });
    const cmd = await getCmd();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      calls.some(
        (c) =>
          c.level === "error" &&
          c.msg.includes("Models directory not found") &&
          c.msg.includes(path.join(resolve, "models")),
      ),
    ).toBe(true);
  });
});

describe("generate:types - success path", () => {
  it("discovers models, builds the schema, writes files, and exits 0", async () => {
    const resolve = path.join(tempRoot, "modules", "user");
    fs.mkdirSync(path.join(resolve, "models"), { recursive: true });
    writeConfig({ user: resolve });
    state.discoverModels = [{ name: "users" }, { name: "profiles" }];
    state.filesMap = new Map([
      ["index.ts", "// index content"],
      ["users.ts", "// users content"],
    ]);

    const cmd = await getCmd();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    // discoverModels invoked with the module's resolved (absolute) path.
    expect(state.discoverModelsArg).toBe(resolve);
    // toModuleSchema invoked with module name + discovered models.
    expect(state.toModuleSchemaArgs?.name).toBe("user");
    expect(state.toModuleSchemaArgs?.models).toEqual(state.discoverModels);
    // generateFilesMap got the schema produced by toModuleSchema + the logger.
    expect(state.generateFilesMapArgs?.schema).toEqual({
      name: "user",
      tables: [],
    });
    expect(state.generateFilesMapArgs?.logger).toBe(ctx.logger);

    // Files were actually written to {resolve}/types.
    const typesDir = path.join(resolve, "types");
    expect(fs.existsSync(typesDir)).toBe(true);
    expect(fs.readdirSync(typesDir).sort()).toEqual(["index.ts", "users.ts"]);
    expect(fs.readFileSync(path.join(typesDir, "index.ts"), "utf-8")).toBe(
      "// index content",
    );
    expect(hasLog(calls, "success", /Types generated successfully/)).toBe(true);
  });

  it("writes into a pre-existing types directory (mkdir-skip branch)", async () => {
    const resolve = path.join(tempRoot, "modules", "post");
    fs.mkdirSync(path.join(resolve, "models"), { recursive: true });
    fs.mkdirSync(path.join(resolve, "types"), { recursive: true });
    writeConfig({ post: resolve });
    state.filesMap = new Map([["index.ts", "x"]]);

    const cmd = await getCmd();
    const { ctx } = ctxFor(["post"]);
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(
      fs.readFileSync(path.join(resolve, "types", "index.ts"), "utf-8"),
    ).toBe("x");
  });
});

describe("generate:types - generation failure path", () => {
  it("returns exit 1 when discoverModels throws after the dir check", async () => {
    const resolve = path.join(tempRoot, "modules", "user");
    fs.mkdirSync(path.join(resolve, "models"), { recursive: true });
    writeConfig({ user: resolve });
    state.discoverThrows = new Error("discover failed");

    const cmd = await getCmd();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Failed to generate types: discover failed/)).toBe(true);
  });

  it("returns exit 1 when generateFilesMap throws", async () => {
    const resolve = path.join(tempRoot, "modules", "user");
    fs.mkdirSync(path.join(resolve, "models"), { recursive: true });
    writeConfig({ user: resolve });
    state.generateThrows = new Error("codegen exploded");

    const cmd = await getCmd();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Failed to generate types: codegen exploded/)).toBe(true);
  });
});
