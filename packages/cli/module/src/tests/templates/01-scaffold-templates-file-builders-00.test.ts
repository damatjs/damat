import { describe, it, expect, packageJsonTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("packageJsonTemplate names the scoped package and wires scripts", () => {
    const out = packageJsonTemplate("user");
    const json = JSON.parse(out);
    expect(json.name).toBe("@damatjs-modules/user");
    expect(json.scripts.dev).toContain("damat module dev");
    expect(json.scripts.dev).toContain("database:setup");
    expect(json.scripts["database:setup"]).toBe("damat module database:setup");
    expect(json.dependencies["@damatjs/module"]).toBe("latest");
    expect(json.dependencies["@damatjs/pipelines"]).toBe("latest");
    expect(out.endsWith("\n")).toBe(true);
  });
});
