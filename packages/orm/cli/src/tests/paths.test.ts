import { describe, it, expect } from "bun:test";
import path from "node:path";
import { resolvePaths, resolveModelsPath, resolveMigrationsPath, resolveTypesPath } from "../cli/utils/paths";
import { getModulesDir, DEFAULT_MODULES_DIR } from "../cli/utils/paths/base";

describe("resolvePaths", () => {
  const cwd = "/test/project";

  it("resolves default paths when no options provided", () => {
    const result = resolvePaths(undefined, {}, undefined, cwd);

    expect(result.modulesDir).toBe(path.join(cwd, DEFAULT_MODULES_DIR));
    expect(result.modelsDir).toBe(path.join(cwd, DEFAULT_MODULES_DIR));
    expect(result.migrationsDir).toBe(path.join(cwd, DEFAULT_MODULES_DIR));
    expect(result.typesDir).toBe(path.join(cwd, DEFAULT_MODULES_DIR));
  });

  it("resolves paths with module name", () => {
    const result = resolvePaths(undefined, {}, "user", cwd);

    expect(result.modelsDir).toBe(path.join(cwd, DEFAULT_MODULES_DIR, "user", "models"));
    expect(result.migrationsDir).toBe(path.join(cwd, DEFAULT_MODULES_DIR, "user", "migrations"));
    expect(result.typesDir).toBe(path.join(cwd, DEFAULT_MODULES_DIR, "user", "types", "common"));
  });

  it("uses cli modulesDir over config", () => {
    const result = resolvePaths("./cli-modules", { modulesDir: "./config-modules" }, undefined, cwd);

    expect(result.modulesDir).toBe(path.join(cwd, "cli-modules"));
  });

  it("uses config modulesDir when cli not provided", () => {
    const result = resolvePaths(undefined, { modulesDir: "./config-modules" }, undefined, cwd);

    expect(result.modulesDir).toBe(path.join(cwd, "config-modules"));
  });

  it("handles absolute paths", () => {
    const result = resolvePaths("/absolute/path", {}, undefined, cwd);

    expect(result.modulesDir).toBe("/absolute/path");
  });
});

describe("resolveModelsPath", () => {
  const cwd = "/test/project";

  it("uses cliModelsDir when provided", () => {
    const result = resolveModelsPath({ cliModelsDir: "./custom-models" }, {}, "user", cwd);
    expect(result).toBe(path.join(cwd, "custom-models"));
  });

  it("uses absolute cliModelsDir directly", () => {
    const result = resolveModelsPath({ cliModelsDir: "/abs/models" }, {}, "user", cwd);
    expect(result).toBe("/abs/models");
  });

  it("uses config modelsDir with module name", () => {
    const result = resolveModelsPath({}, { modelsDir: "./config-models" }, "user", cwd);
    expect(result).toBe(path.join(cwd, "config-models", "user"));
  });

  it("falls back to modules dir structure", () => {
    const result = resolveModelsPath({}, {}, "user", cwd);
    expect(result).toBe(path.join(cwd, DEFAULT_MODULES_DIR, "user", "models"));
  });
});

describe("resolveMigrationsPath", () => {
  const cwd = "/test/project";

  it("uses cliMigrationsDir when provided", () => {
    const result = resolveMigrationsPath({ cliMigrationsDir: "./custom-migrations" }, {}, "user", cwd);
    expect(result).toBe(path.join(cwd, "custom-migrations"));
  });

  it("uses absolute cliMigrationsDir directly", () => {
    const result = resolveMigrationsPath({ cliMigrationsDir: "/abs/migrations" }, {}, "user", cwd);
    expect(result).toBe("/abs/migrations");
  });

  it("uses config migrationsDir with module name", () => {
    const result = resolveMigrationsPath({}, { migrationsDir: "./config-migrations" }, "user", cwd);
    expect(result).toBe(path.join(cwd, "config-migrations", "user"));
  });

  it("falls back to modules dir structure", () => {
    const result = resolveMigrationsPath({}, {}, "user", cwd);
    expect(result).toBe(path.join(cwd, DEFAULT_MODULES_DIR, "user", "migrations"));
  });
});

describe("resolveTypesPath", () => {
  const cwd = "/test/project";

  it("uses cliTypesDir when provided", () => {
    const result = resolveTypesPath({ cliTypesDir: "./custom-types" }, {}, "user", cwd);
    expect(result).toBe(path.join(cwd, "custom-types"));
  });

  it("uses absolute cliTypesDir directly", () => {
    const result = resolveTypesPath({ cliTypesDir: "/abs/types" }, {}, "user", cwd);
    expect(result).toBe("/abs/types");
  });

  it("uses config typesDir with module name", () => {
    const result = resolveTypesPath({}, { typesDir: "./config-types" }, "user", cwd);
    expect(result).toBe(path.join(cwd, "config-types", "user", "common"));
  });

  it("falls back to modules dir structure", () => {
    const result = resolveTypesPath({}, {}, "user", cwd);
    expect(result).toBe(path.join(cwd, DEFAULT_MODULES_DIR, "user", "types", "common"));
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
