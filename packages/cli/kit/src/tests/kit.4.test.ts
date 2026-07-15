import { type KitManifest, afterEach, baseManifest, beforeEach, describe, expect, fsState, it, join, KIT_MANIFEST_FILENAME, readKitManifest, resetKitTests, stageLocalKit } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit manifest", () => {
  describe("readKitManifest", () => {
    it("throws when damat-kit.json is missing", () => {
      expect(() => readKitManifest("/kit")).toThrow(
        `${KIT_MANIFEST_FILENAME} not found in /kit`,
      );
    });

    it("throws on invalid JSON", () => {
      fsState.existsMap[join("/kit", KIT_MANIFEST_FILENAME)] = true;
      fsState.readFileMap[join("/kit", KIT_MANIFEST_FILENAME)] = "{not json";
      expect(() => readKitManifest("/kit")).toThrow(
        new RegExp(`${KIT_MANIFEST_FILENAME} is not valid JSON`),
      );
    });

    it("throws with every structural error listed", () => {
      stageLocalKit("/kit", { name: "Bad Name", mappings: "nope" });
      let message = "";
      try {
        readKitManifest("/kit");
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toContain(`${KIT_MANIFEST_FILENAME} is invalid:`);
      expect(message).toContain("kebab-case");
      expect(message).toContain("`mappings` must be an array");
    });

    it("returns the parsed manifest when valid", () => {
      const manifest = baseManifest({ version: "1.2.3" });
      stageLocalKit("/kit", manifest);
      expect(readKitManifest("/kit")).toEqual(
        manifest as unknown as KitManifest,
      );
    });
  });
});
