import {
  describe,
  it,
  expect,
  augmentWithLinks,
  userModels,
  makeLogger,
} from "./context";

describe("augmentWithLinks", () => {
  it("no-ops when there are no link modules", async () => {
    const logger = makeLogger();
    const filesMap = new Map<string, string>();
    await augmentWithLinks(
      {
        modules: { user: { resolve: userModels } },
        moduleName: "user",
        logger,
      },
      filesMap,
    );
    expect(filesMap.size).toBe(0);
    expect(logger.warnings).toEqual([]);
  });
});
