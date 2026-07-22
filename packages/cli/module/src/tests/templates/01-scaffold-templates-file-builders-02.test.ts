import { describe, it, expect, manifestTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("manifestTemplate declares only implemented capabilities", () => {
    const json = JSON.parse(manifestTemplate("user"));
    expect(json.name).toBe("user");
    expect(json.version).toBe("0.0.1");
    expect(json.kind).toBe("module");
    expect(json.install.default).toBe("source");
    expect(json.module.tests).toBe("./tests");
    expect(json.module.models).toBeUndefined();
    expect(json.module.workflows).toBeUndefined();
    expect(Object.keys(json.install.provides).sort()).toEqual([
      "module",
      "tests",
    ]);
    expect(json.module.entry).toBeUndefined();
  });
});
