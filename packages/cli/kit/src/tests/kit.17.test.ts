import { afterEach, baseManifest, beforeEach, createContext, describe, expect, fixtures, it, kitValidateCommand, resetKitTests, stageLocalKit } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit validate command", () => {
  it("exits 1 when the manifest is missing or invalid", async () => {
    const { ctx, logger } = createContext({}, { cwd: "/kitproj" });
    const res = await kitValidateCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Kit manifest invalid"),
      ),
    ).toBe(true);
  });

  it("prints the placement preview and summary for a valid kit", async () => {
    stageLocalKit(
      "/kitproj",
      baseManifest({
        mappings: [{ from: "*.ts", to: "src" }],
        fallback: "shared",
      }),
    );
    fixtures.readdir = { "/kitproj": ["a.ts", "b.md", "damat-kit.json"] };
    const { ctx, logger } = createContext({}, { cwd: "/kitproj" });
    const res = await kitValidateCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const preview = logger.info.mock.calls.find((c) =>
      String(c[0]).includes('Kit "design-kit" placement preview:'),
    );
    expect(preview).toBeDefined();
    expect(preview![0]).toContain("a.ts -> src/a.ts");
    expect(preview![0]).toContain("b.md -> shared/b.md  (fallback)");
    const summary = logger.info.mock.calls.find((c) => c[0] === "Summary");
    expect(summary![1]).toEqual({ mapped: 1, fallback: 1, unmatched: 0 });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith("Kit manifest is valid");
  });

  it("warns about unmatched files but still validates", async () => {
    stageLocalKit(
      "/kitproj",
      baseManifest({ mappings: [{ from: "*.ts", to: "src" }] }),
    );
    fixtures.readdir = { "/kitproj": ["a.ts", "b.md", "damat-kit.json"] };
    const { ctx, logger } = createContext({}, { cwd: "/kitproj" });
    const res = await kitValidateCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const warn = logger.warn.mock.calls.find((c) =>
      String(c[0]).includes("installs will skip them"),
    );
    expect(warn).toBeDefined();
    expect(String(warn![0])).toContain("- b.md");
    const summary = logger.info.mock.calls.find((c) => c[0] === "Summary");
    expect(summary![1]).toEqual({ mapped: 1, fallback: 0, unmatched: 1 });
    expect(logger.success).toHaveBeenCalledWith("Kit manifest is valid");
  });

});
