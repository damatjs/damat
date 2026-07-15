import { afterEach, baseManifest, beforeEach, cpCalls, createContext, describe, expect, it, join, KIT_RECORD_FILENAME, kitAddCommand, mockMkdirSync, resetKitTests, spawnSyncCalls, stageLocalKit, writeCalls } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit add command", () => {
  it("installs files, records the kit, runs bun add and prints notes", async () => {
    stageLocalKit(
      "/kit",
      baseManifest({
        version: "2.0.0",
        packages: { react: "^18.0.0" },
        notes: "Wire the provider into your app root.",
      }),
    );
    const { ctx, logger } = createContext(
      { install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    // app.ts copied to the mapped location, parent dir ensured first.
    expect(cpCalls).toEqual([
      { src: "/kit/app.ts", dest: "/project/src/kit/app.ts", opts: undefined },
    ]);
    expect(
      mockMkdirSync.mock.calls.some((c) => c[0] === "/project/src/kit"),
    ).toBe(true);
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes('Installed 1 file(s) from "design-kit"'),
      ),
    ).toBe(true);
    // The committable record was written.
    const record = writeCalls.find(
      (w) => w.path === join("/project", KIT_RECORD_FILENAME),
    );
    expect(record).toBeDefined();
    const parsed = JSON.parse(record!.content);
    expect(parsed.kits).toHaveLength(1);
    expect(parsed.kits[0]).toMatchObject({
      name: "design-kit",
      version: "2.0.0",
      source: "/kit",
      sourceType: "path",
      files: ["src/kit/app.ts"],
    });
    expect(typeof parsed.kits[0].installedAt).toBe("string");
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes(`Recorded the kit in ${KIT_RECORD_FILENAME}`),
      ),
    ).toBe(true);
    // Packages installed via bun add with lifecycle scripts off by default.
    const bunAdd = spawnSyncCalls.find((c) => c.cmd === "bun");
    expect(bunAdd).toBeDefined();
    expect(bunAdd!.args).toEqual(["add", "--ignore-scripts", "react@^18.0.0"]);
    expect(logger.success).toHaveBeenCalledWith("Packages installed");
    // Notes surfaced at the end.
    expect(
      logger.info.mock.calls.some(
        (c) =>
          String(c[0]).includes('Notes from "design-kit"') &&
          String(c[0]).includes("Wire the provider"),
      ),
    ).toBe(true);
  });

});
