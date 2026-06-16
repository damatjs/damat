import { describe, it, expect } from "bun:test";
import path from "node:path";
import {
  resolveBasePath,
  getModulesDir,
  DEFAULT_MODULES_DIR,
} from "../cli/utils/paths/base";
import { resolveModelsPath } from "../cli/utils/paths/models";
import { resolvePaths } from "../cli/utils/paths";

const cwd = "/work/project";

describe("resolveBasePath", () => {
  it("prefers an absolute cliPath verbatim", () => {
    expect(
      resolveBasePath("/abs/cli/path", "config/path", "default/path", cwd),
    ).toBe("/abs/cli/path");
  });

  it("joins a relative cliPath with cwd", () => {
    expect(resolveBasePath("rel/cli", "config/path", "default", cwd)).toBe(
      path.join(cwd, "rel/cli"),
    );
  });

  it("falls back to configPath (absolute) when cliPath is undefined", () => {
    expect(
      resolveBasePath(undefined, "/abs/config", "default", cwd),
    ).toBe("/abs/config");
  });

  it("joins a relative configPath with cwd when cliPath is undefined", () => {
    expect(resolveBasePath(undefined, "rel/config", "default", cwd)).toBe(
      path.join(cwd, "rel/config"),
    );
  });

  it("uses the default path joined with cwd when both inputs are undefined", () => {
    expect(resolveBasePath(undefined, undefined, "default/dir", cwd)).toBe(
      path.join(cwd, "default/dir"),
    );
  });

  it("treats an empty-string cliPath as falsy and falls through to config", () => {
    expect(resolveBasePath("", "rel/config", "default", cwd)).toBe(
      path.join(cwd, "rel/config"),
    );
  });
});

describe("getModulesDir", () => {
  it("returns an absolute configModulesDir untouched", () => {
    expect(getModulesDir("/abs/modules", cwd)).toBe("/abs/modules");
  });

  it("joins a relative configModulesDir with cwd", () => {
    expect(getModulesDir("custom/modules", cwd)).toBe(
      path.join(cwd, "custom/modules"),
    );
  });

  it("uses DEFAULT_MODULES_DIR joined with cwd when undefined", () => {
    expect(getModulesDir(undefined, cwd)).toBe(
      path.join(cwd, DEFAULT_MODULES_DIR),
    );
  });

  it("DEFAULT_MODULES_DIR is the conventional src/modules", () => {
    expect(DEFAULT_MODULES_DIR).toBe("src/modules");
  });
});

describe("resolveModelsPath - default cwd parameter", () => {
  it("ignores cwd and always appends 'models' to the module resolver", () => {
    const resolver = "/abs/module";
    expect(resolveModelsPath(resolver)).toBe(path.join(resolver, "models"));
    // Passing an explicit cwd does not change the result (current behavior).
    expect(resolveModelsPath(resolver, "/some/other/cwd")).toBe(
      path.join(resolver, "models"),
    );
  });
});

describe("resolvePaths - relative resolvers", () => {
  it("derives all sub-paths from a relative module resolver as-is", () => {
    const resolver = "relative/module";
    const result = resolvePaths(resolver);
    expect(result.modulesDir).toBe(resolver);
    expect(result.modelsDir).toBe(path.join(resolver, "models"));
    expect(result.migrationsDir).toBe(path.join(resolver, "migrations"));
    expect(result.typesDir).toBe(path.join(resolver, "types"));
  });
});
