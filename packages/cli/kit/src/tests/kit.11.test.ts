import { afterEach, baseManifest, beforeEach, cpCalls, createContext, describe, expect, fixtures, it, kitAddCommand, mockMkdirSync, resetKitTests, spawnSyncCalls, stageLocalKit, writeCalls } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit add command", () => {
  it("warns about unmatched files when the kit has no fallback", async () => {
    stageLocalKit("/kit", {
      name: "design-kit",
      mappings: [{ from: "src/**", to: "lib" }],
    });
    const { ctx, logger } = createContext(
      { "dry-run": true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx); // default tree: a single app.ts
    expect(res.exitCode).toBe(0);
    const warn = logger.warn.mock.calls.find((c) =>
      String(c[0]).includes("matched no mapping"),
    );
    expect(warn).toBeDefined();
    expect(String(warn![0])).toContain("- app.ts");
  });

  it("--dry-run prints the full plan (incl. fallback marker and bun add) and writes nothing", async () => {
    stageLocalKit(
      "/kit",
      baseManifest({
        version: "1.0.0",
        description: "UI kit",
        mappings: [{ from: "components/**", to: "src/ui" }],
        fallback: "shared",
        packages: { react: "^18.0.0" },
      }),
    );
    fixtures.readdir = {
      "/kit": ["components", "notes.txt", "damat-kit.json"],
      "/kit/components": ["a.ts"],
    };
    fixtures.directory = { "/kit/components": true };
    const { ctx, logger } = createContext(
      { "dry-run": true, install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Header logged with version + description + file count.
    const header = logger.info.mock.calls.find(
      (c) => c[0] === 'Kit "design-kit"',
    );
    expect(header![1]).toMatchObject({
      version: "1.0.0",
      description: "UI kit",
      files: 2,
    });
    const plan = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("Dry run"),
    );
    expect(plan).toBeDefined();
    expect(plan![0]).toContain("components/a.ts -> src/ui/a.ts");
    expect(plan![0]).toContain("notes.txt -> shared/notes.txt  (fallback)");
    expect(plan![0]).toContain("+ bun add react");
    // ZERO writes of any kind.
    expect(writeCalls).toHaveLength(0);
    expect(cpCalls).toHaveLength(0);
    expect(mockMkdirSync.mock.calls).toHaveLength(0);
    expect(spawnSyncCalls).toHaveLength(0);
  });

});
