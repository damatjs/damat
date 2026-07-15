import { afterEach, beforeEach, createContext, describe, expect, fsState, it, join, KIT_MANIFEST_FILENAME, kitInitCommand, resetKitTests, writeCalls } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit init command", () => {
  it("derives the kit name from the cwd basename and writes the starter manifest", async () => {
    const { ctx, logger } = createContext({}, { cwd: "/work/my-kit" });
    const res = await kitInitCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const write = writeCalls.find(
      (w) => w.path === join("/work/my-kit", KIT_MANIFEST_FILENAME),
    );
    expect(write).toBeDefined();
    const starter = JSON.parse(write!.content);
    expect(starter).toMatchObject({
      name: "my-kit",
      version: "0.1.0",
      mappings: [{ from: "src/**", to: "src/my-kit" }],
      fallback: "shared/my-kit",
    });
    expect(Array.isArray(starter.ignore)).toBe(true);
    expect(logger.success).toHaveBeenCalledWith(
      `Wrote ${KIT_MANIFEST_FILENAME}`,
    );
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes("damat kit validate"),
      ),
    ).toBe(true);
  });

  it("prefers an explicit name argument", async () => {
    const { ctx } = createContext(
      {},
      { args: ["design-system"], cwd: "/somewhere/Else" },
    );
    const res = await kitInitCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const starter = JSON.parse(writeCalls[0]!.content);
    expect(starter.name).toBe("design-system");
    expect(starter.mappings).toEqual([
      { from: "src/**", to: "src/design-system" },
    ]);
  });

  it("rejects a non-kebab-case name", async () => {
    const { ctx, logger } = createContext({}, { args: ["Bad_Name"] });
    const res = await kitInitCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("kebab-case")),
    ).toBe(true);
    expect(writeCalls).toHaveLength(0);
  });

  it("refuses to overwrite an existing manifest", async () => {
    fsState.existsMap[join("/project", KIT_MANIFEST_FILENAME)] = true;
    const { ctx, logger } = createContext({}, { args: ["my-kit"] });
    const res = await kitInitCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      `${KIT_MANIFEST_FILENAME} already exists`,
    );
    expect(writeCalls).toHaveLength(0);
  });
});
