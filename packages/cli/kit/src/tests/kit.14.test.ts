import { afterEach, baseManifest, beforeEach, createContext, describe, expect, fsState, it, join, KIT_RECORD_FILENAME, kitAddCommand, resetKitTests, spawnSyncCalls, stageLocalKit, writeCalls } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit add command", () => {
  it("upserts damat-kits.json, replacing the same-name entry and keeping others", async () => {
    stageLocalKit("/kit", baseManifest());
    const recordPath = join("/project", KIT_RECORD_FILENAME);
    fsState.existsMap[recordPath] = true;
    fsState.readFileMap[recordPath] = JSON.stringify({
      kits: [
        {
          name: "design-kit",
          source: "old-source",
          sourceType: "git",
          installedAt: "2020-01-01T00:00:00.000Z",
          files: ["stale.ts"],
        },
        {
          name: "other-kit",
          source: "/elsewhere",
          sourceType: "path",
          installedAt: "2021-01-01T00:00:00.000Z",
          files: ["x.ts"],
        },
      ],
    });
    const { ctx } = createContext({ install: true }, { args: ["/kit"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const record = writeCalls.find((w) => w.path === recordPath);
    const parsed = JSON.parse(record!.content);
    expect(parsed.kits).toHaveLength(2);
    expect(parsed.kits[0].name).toBe("other-kit"); // untouched sibling kept
    expect(parsed.kits[1]).toMatchObject({
      name: "design-kit",
      source: "/kit",
      sourceType: "path",
      files: ["src/kit/app.ts"],
    });
    expect(parsed.kits[1].installedAt).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("starts a fresh record when the existing damat-kits.json is unreadable", async () => {
    stageLocalKit("/kit", baseManifest());
    const recordPath = join("/project", KIT_RECORD_FILENAME);
    fsState.existsMap[recordPath] = true;
    fsState.readFileMap[recordPath] = "{not json";
    const { ctx } = createContext({ install: true }, { args: ["/kit"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const record = writeCalls.find((w) => w.path === recordPath);
    const parsed = JSON.parse(record!.content);
    expect(parsed.kits).toHaveLength(1);
    expect(parsed.kits[0].name).toBe("design-kit");
  });

  it("--no-install skips bun add entirely", async () => {
    stageLocalKit("/kit", baseManifest({ packages: { react: "^18.0.0" } }));
    const { ctx } = createContext({ install: false }, { args: ["/kit"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(spawnSyncCalls.some((c) => c.cmd === "bun")).toBe(false);
  });

});
