import { describe, expect, test } from "bun:test";
import { selectInstallMode, type InstallRecipe } from "../../index";

const recipe = (install?: InstallRecipe["install"]): InstallRecipe => ({
  schemaVersion: 1,
  id: "blade",
  kind: "module",
  install,
});

describe("selectInstallMode", () => {
  test("uses override, manifest default, then source", () => {
    expect(
      selectInstallMode(
        "package",
        recipe({ modes: ["source", "package"], default: "source" }),
        ["source", "package"],
      ),
    ).toBe("package");
    expect(
      selectInstallMode(
        undefined,
        recipe({ modes: ["source", "package"], default: "package" }),
        ["source", "package"],
      ),
    ).toBe("package");
    expect(selectInstallMode(undefined, recipe(), ["source"])).toBe("source");
  });

  test("never silently changes an unsupported explicit or default mode", () => {
    expect(() =>
      selectInstallMode("package", recipe({ modes: ["source", "package"] }), [
        "source",
      ]),
    ).toThrow("package");
    expect(() =>
      selectInstallMode(
        undefined,
        recipe({ modes: ["package"], default: "package" }),
        ["source"],
      ),
    ).toThrow("package");
  });
});
