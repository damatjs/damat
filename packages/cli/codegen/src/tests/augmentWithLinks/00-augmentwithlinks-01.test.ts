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
  it("weaves the linked field and re-exports it from index.ts", async () => {
    const logger = makeLogger();
    const filesMap = new Map<string, string>([["index.ts", "// base\n"]]);
    await augmentWithLinks(
      {
        modules: {
          user: { resolve: userModels },
          organization: { resolve: orgModels },
          userOrgLink: { resolve: linkMod, kind: "link" },
        },
        moduleName: "user",
        logger,
      },
      filesMap,
    );
    // A `<table>.links.ts` augmentation was added and index.ts re-exports it.
    const linkFile = [...filesMap.keys()].find((k) => k.endsWith(".links.ts"));
    expect(linkFile).toBeDefined();
    expect(filesMap.get("index.ts")).toContain("export * from");
    expect(logger.warnings).toEqual([]);
  });
});
