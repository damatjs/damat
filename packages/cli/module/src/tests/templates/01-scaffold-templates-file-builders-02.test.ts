import { describe, it, expect, manifestTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("manifestTemplate records the universal provider and runtime", () => {
    const json = JSON.parse(manifestTemplate("user"));
    expect(json.name).toBe("user");
    expect(json.version).toBe("0.0.1");
    expect(json.kind).toBe("module");
    expect(json.install.default).toBe("source");
    expect(json.module.models).toBe("./src/models");
  });
});
