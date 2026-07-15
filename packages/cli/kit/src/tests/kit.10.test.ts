import { TMP, afterEach, baseManifest, beforeEach, cpCalls, createContext, describe, expect, it, KIT_MANIFEST_FILENAME, KIT_RECORD_FILENAME, kitAddCommand, resetKitTests, rmCalls, spawnSyncCalls, stageLocalKit, writeCalls } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit add command", () => {
  it("exports the install-record filename", () => {
    expect(KIT_RECORD_FILENAME).toBe("damat-kits.json");
  });

  it("errors when no source is given", async () => {
    const { ctx, logger } = createContext({});
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("Usage: damat kit add <source>");
  });

  it("exits 1 when the source cannot be resolved", async () => {
    const { ctx, logger } = createContext({}, { args: ["???bad???"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Could not resolve kit source"),
      ),
    ).toBe(true);
  });

  it("exits 1 on an invalid manifest and still cleans a git checkout", async () => {
    // Clone succeeds, but the checkout ships no damat-kit.json.
    const { ctx, logger } = createContext({}, { args: ["acme/design-kit"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some(
        (c) =>
          String(c[0]).includes("Failed to add kit") &&
          String(c[0]).includes(`${KIT_MANIFEST_FILENAME} not found`),
      ),
    ).toBe(true);
    // finally-cleanup removed the temp clone even though the add failed.
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

  it("refuses unsafe package specs before writing anything", async () => {
    stageLocalKit(
      "/kit",
      baseManifest({ packages: { evil: "file:../../pwn" } }),
    );
    const { ctx, logger } = createContext(
      { install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("unsafe package specs"),
      ),
    ).toBe(true);
    expect(cpCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
    expect(spawnSyncCalls).toHaveLength(0); // no bun add either
  });

});
