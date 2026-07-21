import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  moduleLocationId,
  resolveModuleImport,
} from "../../services/moduleLocation";

describe("resolveModuleImport", () => {
  test("preserves source paths and Node package specifiers", () => {
    expect(resolveModuleImport("src/modules/user", "/app")).toBe(
      pathToFileURL("/app/src/modules/user").href,
    );
    expect(
      resolveModuleImport({ type: "package", name: "@acme/user" }, "/app"),
    ).toBe("@acme/user");
  });

  test("resolves Damat packages only inside the project store", () => {
    expect(
      resolveModuleImport({ type: "damat", path: "user/index.ts" }, "/app"),
    ).toBe(pathToFileURL(join("/app", ".damat/packages/user/index.ts")).href);
    expect(() =>
      resolveModuleImport({ type: "damat", path: "../escape" }, "/app"),
    ).toThrow("inside .damat/packages");
  });

  test("derives ids for source, Node, and Damat locations", () => {
    expect(moduleLocationId("src/modules/user")).toBe("user");
    expect(moduleLocationId({ type: "package", name: "@acme/user" })).toBe(
      "user",
    );
    expect(moduleLocationId({ type: "damat", path: "user/index.ts" })).toBe(
      "user",
    );
  });
});
