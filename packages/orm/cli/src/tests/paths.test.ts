import { describe, it, expect } from "bun:test";
import path from "node:path";
import { resolvePaths, resolveModelsPath, resolveMigrationsPath, resolveTypesPath } from "../cli/utils/paths";
import { getModulesDir, DEFAULT_MODULES_DIR } from "../cli/utils/paths/base";

describe("resolvePaths", () => {
  const moduleResolver = "/test/project/src/modules/user";

  it("resolves paths from moduleResolver", () => {
    const result = resolvePaths(moduleResolver);

    expect(result.modulesDir).toBe(moduleResolver);
    expect(result.modelsDir).toBe(path.join(moduleResolver, "models"));
    expect(result.migrationsDir).toBe(path.join(moduleResolver, "migrations"));
    expect(result.typesDir).toBe(path.join(moduleResolver, "types", "common"));
  });

  it("handles different module resolvers", () => {
    const customResolver = "/another/path/my-module";
    const result = resolvePaths(customResolver);

    expect(result.modulesDir).toBe(customResolver);
    expect(result.modelsDir).toBe(path.join(customResolver, "models"));
    expect(result.migrationsDir).toBe(path.join(customResolver, "migrations"));
    expect(result.typesDir).toBe(path.join(customResolver, "types", "common"));
  });
});

describe("resolveModelsPath", () => {
  const moduleResolver = "/test/project/src/modules/user";
  const cwd = "/test/project";

  it("uses cliModelsDir when provided (relative)", () => {
    const result = resolveModelsPath({ cliModelsDir: "./custom-models" }, moduleResolver, cwd);
    expect(result).toBe(path.join(cwd, "custom-models"));
  });

  it("uses absolute cliModelsDir directly", () => {
    const result = resolveModelsPath({ cliModelsDir: "/abs/models" }, moduleResolver, cwd);
    expect(result).toBe("/abs/models");
  });

  it("falls back to moduleResolver when no cliModelsDir", () => {
    const result = resolveModelsPath({}, moduleResolver, cwd);
    expect(result).toBe(path.join(moduleResolver, "models"));
  });
});

describe("resolveMigrationsPath", () => {
  const moduleResolver = "/test/project/src/modules/user";

  it("resolves migrations path from moduleResolver", () => {
    const result = resolveMigrationsPath(moduleResolver);
    expect(result).toBe(path.join(moduleResolver, "migrations"));
  });
});

describe("resolveTypesPath", () => {
  const moduleResolver = "/test/project/src/modules/user";

  it("resolves types path from moduleResolver", () => {
    const result = resolveTypesPath(moduleResolver);
    expect(result).toBe(path.join(moduleResolver, "types", "common"));
  });
});

describe("getModulesDir", () => {
  const cwd = "/test/project";

  it("returns default when no config provided", () => {
    const result = getModulesDir(undefined, cwd);
    expect(result).toBe(path.join(cwd, DEFAULT_MODULES_DIR));
  });

  it("uses absolute config path directly", () => {
    const result = getModulesDir("/abs/modules", cwd);
    expect(result).toBe("/abs/modules");
  });

  it("joins relative config path with cwd", () => {
    const result = getModulesDir("./my-modules", cwd);
    expect(result).toBe(path.join(cwd, "my-modules"));
  });
});

describe("DEFAULT_MODULES_DIR", () => {
  it("has expected value", () => {
    expect(DEFAULT_MODULES_DIR).toBe("src/modules");
  });
});
