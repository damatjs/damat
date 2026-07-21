import { describe, it, expect, tsconfigTemplate } from "./context";

describe("scaffold/templates file builders", () => {
  it("tsconfigTemplate writes portable aliases for the module id", () => {
    const out = tsconfigTemplate("user");
    const json = JSON.parse(out);
    expect(json.compilerOptions.paths["@user/*"]).toEqual(["./src/*"]);
    expect(json.compilerOptions.paths["@workflows"]).toEqual([
      "./src/workflows",
    ]);
    expect(json.compilerOptions.paths["@workflows/*"]).toEqual([
      "./src/workflows/*",
    ]);
  });
});
