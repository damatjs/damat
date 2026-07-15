import { afterEach, baseManifest, beforeEach, cpCalls, createContext, describe, expect, fixtures, fsState, it, kitAddCommand, resetKitTests, stageLocalKit } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit add command", () => {
  it("refuses to write outside the project root even if a plan target escapes", async () => {
    // The manifest's lexical checks make this unreachable through real file
    // trees; a mocked readdir entry with ../ segments exercises the
    // defense-in-depth guard in copyPlanned.
    stageLocalKit(
      "/kit",
      baseManifest({ mappings: [{ from: "**", to: "x" }] }),
    );
    fixtures.readdir = { "/kit": ["../../escape.ts"] };
    const { ctx, logger } = createContext(
      { install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Refusing to write outside the project root"),
      ),
    ).toBe(true);
    expect(cpCalls).toHaveLength(0);
  });

  it("exits 1 when bun add fails", async () => {
    stageLocalKit("/kit", baseManifest({ packages: { react: "^18.0.0" } }));
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "boom" };
    const { ctx, logger } = createContext(
      { install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some(
        (c) =>
          String(c[0]).includes("bun add failed") &&
          String(c[0]).includes("boom"),
      ),
    ).toBe(true);
  });
});
