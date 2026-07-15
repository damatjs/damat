import {
  describe,
  it,
  expect,
  augmentWithLinks,
  userModels,
  orgModels,
  linkMod,
  makeLogger,
} from "./context";

describe("augmentWithLinks", () => {
  it("starts the index from empty when no base index.ts exists", async () => {
    const logger = makeLogger();
    const filesMap = new Map<string, string>();
    await augmentWithLinks(
      {
        modules: {
          user: { resolve: userModels },
          organization: { resolve: orgModels },
          userOrgLink: { resolve: linkMod, kind: "link" },
        },
        // Match the OTHER side too — both directions are iterated.
        moduleName: "organization",
        logger,
      },
      filesMap,
    );
    expect([...filesMap.keys()].some((k) => k.endsWith(".links.ts"))).toBe(
      true,
    );
    expect(filesMap.get("index.ts")).toContain("export * from");
  });
});
