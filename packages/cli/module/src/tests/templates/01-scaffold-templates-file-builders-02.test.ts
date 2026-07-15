import { describe, it, expect, manifestTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("manifestTemplate records name/version/paths", () => {
    const json = JSON.parse(manifestTemplate("user"));
    expect(json.name).toBe("user");
    expect(json.version).toBe("0.0.1");
    expect(json.paths.models).toBe("./models");
  });
});
