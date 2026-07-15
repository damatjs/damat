import { afterEach, baseManifest, beforeEach, cpCalls, createContext, describe, expect, fsState, it, kitAddCommand, resetKitTests, stageLocalKit } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit add command", () => {
  it("keeps existing files by default and overwrites them with --force", async () => {
    stageLocalKit("/kit", baseManifest());
    fsState.existsMap["/project/src/kit/app.ts"] = true;

    const first = createContext({ install: true }, { args: ["/kit"] });
    const res1 = await kitAddCommand.handler(first.ctx);
    expect(res1.exitCode).toBe(0);
    expect(cpCalls).toHaveLength(0); // kept, not overwritten
    expect(
      first.logger.success.mock.calls.some((c) =>
        String(c[0]).includes("Installed 0 file(s)"),
      ),
    ).toBe(true);
    const warn = first.logger.warn.mock.calls.find((c) =>
      String(c[0]).includes("--force to overwrite"),
    );
    expect(warn).toBeDefined();
    expect(String(warn![0])).toContain("src/kit/app.ts");

    const second = createContext(
      { install: true, force: true },
      { args: ["/kit"] },
    );
    const res2 = await kitAddCommand.handler(second.ctx);
    expect(res2.exitCode).toBe(0);
    expect(cpCalls).toEqual([
      { src: "/kit/app.ts", dest: "/project/src/kit/app.ts", opts: undefined },
    ]);
    expect(
      second.logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("--force to overwrite"),
      ),
    ).toBe(false);
  });

});
