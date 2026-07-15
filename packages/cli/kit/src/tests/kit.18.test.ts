import { afterEach, baseManifest, beforeEach, createContext, describe, expect, fixtures, it, kitValidateCommand, resetKitTests, stageLocalKit } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit validate command", () => {
  it("exits 1 when the kit ships no files at all", async () => {
    stageLocalKit(
      "/kitproj",
      baseManifest({ mappings: [{ from: "src/**", to: "lib" }] }),
    );
    fixtures.readdir = { "/kitproj": ["damat-kit.json"] };
    const { ctx, logger } = createContext({}, { cwd: "/kitproj" });
    const res = await kitValidateCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("ships no files"),
      ),
    ).toBe(true);
    expect(logger.success).not.toHaveBeenCalled();
  });
});
