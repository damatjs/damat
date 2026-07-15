import { describe, expect, test } from "bun:test";
import { parseInstallRecipe } from "../../index";

const validRecipe = {
  schemaVersion: 1,
  id: "auth-provider",
  kind: "provider",
  version: "1.2.3",
  install: { modes: ["source", "package"], default: "source" },
  mappings: [{ from: "src/**", to: "src/providers/auth" }],
  ignore: ["**/*.test.ts"],
  package: { name: "@example/auth", ref: "1.2.3" },
  packages: { zod: "^4.0.0" },
  usageHints: [{ token: "getAuth", targets: ["src/**/*.ts"] }],
};

describe("parseInstallRecipe", () => {
  test("accepts a complete declarative recipe", () => {
    expect(parseInstallRecipe(validRecipe)).toEqual(validRecipe);
  });

  test.each(["Auth", "auth_provider", "auth/provider", "-auth"])(
    "rejects invalid installation id %s",
    (id) => {
      expect(() => parseInstallRecipe({ ...validRecipe, id })).toThrow("id");
    },
  );

  test("requires a supported default mode", () => {
    const install = { modes: ["source"], default: "package" };
    expect(() => parseInstallRecipe({ ...validRecipe, install })).toThrow(
      "default",
    );
  });

  test("rejects duplicate and unknown modes", () => {
    expect(() =>
      parseInstallRecipe({
        ...validRecipe,
        install: { modes: ["source", "source"] },
      }),
    ).toThrow("modes");
    expect(() =>
      parseInstallRecipe({ ...validRecipe, install: { modes: ["linked"] } }),
    ).toThrow("mode");
  });

  test.each(["/absolute", "../escape", "src/../../escape", "C:\\escape"])(
    "rejects unsafe mapping target %s",
    (to) => {
      expect(() =>
        parseInstallRecipe({
          ...validRecipe,
          mappings: [{ from: "src/**", to }],
        }),
      ).toThrow("to");
    },
  );

  test("requires literal non-empty usage hints and package entries", () => {
    expect(() =>
      parseInstallRecipe({ ...validRecipe, usageHints: [{ token: "" }] }),
    ).toThrow("token");
    expect(() =>
      parseInstallRecipe({
        ...validRecipe,
        usageHints: [{ token: "getAuth", targets: [""] }],
      }),
    ).toThrow("targets");
    expect(() =>
      parseInstallRecipe({ ...validRecipe, ignore: "**/*.test.ts" }),
    ).toThrow("ignore");
    expect(() =>
      parseInstallRecipe({ ...validRecipe, packages: { zod: "" } }),
    ).toThrow("zod");
  });

  test.each(["hooks", "scripts", "commands", "run"])(
    "rejects executable field %s",
    (field) => {
      expect(() =>
        parseInstallRecipe({ ...validRecipe, [field]: ["danger"] }),
      ).toThrow(field);
    },
  );

  test("rejects function-bearing and nested unknown fields", () => {
    expect(() =>
      parseInstallRecipe({ ...validRecipe, setup: () => undefined }),
    ).toThrow("setup");
    expect(() =>
      parseInstallRecipe({
        ...validRecipe,
        package: { ...validRecipe.package, script: "run" },
      }),
    ).toThrow("script");
  });
});
