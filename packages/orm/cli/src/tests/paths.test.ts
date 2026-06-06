import { describe, it, expect } from "bun:test";
import path from "node:path";
import {
  resolvePaths,
  resolveModelsPath,
  resolveMigrationsPath,
  resolveTypesPath,
} from "../cli/utils/paths";

describe("resolvePaths", () => {
  const moduleResolver = "/test/project/src/modules/user";

  it("resolves paths from moduleResolver", () => {
    const result = resolvePaths(moduleResolver);

    expect(result.modulesDir).toBe(moduleResolver);
    expect(result.modelsDir).toBe(path.join(moduleResolver, "models"));
    expect(result.migrationsDir).toBe(path.join(moduleResolver, "migrations"));
    expect(result.typesDir).toBe(path.join(moduleResolver, "types"));
  });

  it("handles different module resolvers", () => {
    const customResolver = "/another/path/my-module";
    const result = resolvePaths(customResolver);

    expect(result.modulesDir).toBe(customResolver);
    expect(result.modelsDir).toBe(path.join(customResolver, "models"));
    expect(result.migrationsDir).toBe(path.join(customResolver, "migrations"));
    expect(result.typesDir).toBe(path.join(customResolver, "types"));
  });
});

describe("resolveModelsPath", () => {
  const moduleResolver = "/test/project/src/modules/user";

  it("resolves models path from moduleResolver", () => {
    const result = resolveModelsPath(moduleResolver);
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
    expect(result).toBe(path.join(moduleResolver, "types"));
  });
});
