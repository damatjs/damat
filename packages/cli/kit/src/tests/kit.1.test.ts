import { afterEach, beforeEach, describe, expect, it, KIT_MANIFEST_FILENAME, resetKitTests } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit manifest", () => {
  it("exports the manifest filename", () => {
    expect(KIT_MANIFEST_FILENAME).toBe("damat-kit.json");
  });

});
