import { describe, it, expect } from "bun:test";
import * as core from "../index";
import {
  ModelRegistry,
  ModelRegistryError,
  QueryLogger,
  getQueryLogger,
  setQueryLogger,
  configureQueryLogger,
} from "../index";

describe("public API surface (src/index.ts)", () => {
  it("re-exports the registry classes", () => {
    expect(ModelRegistry).toBeDefined();
    expect(typeof ModelRegistry).toBe("function");
    expect(ModelRegistryError).toBeDefined();
    expect(typeof ModelRegistryError).toBe("function");
  });

  it("re-exports the query logger class and helpers", () => {
    expect(QueryLogger).toBeDefined();
    expect(typeof QueryLogger).toBe("function");
    expect(typeof getQueryLogger).toBe("function");
    expect(typeof setQueryLogger).toBe("function");
    expect(typeof configureQueryLogger).toBe("function");
  });

  it("exposes exactly the documented runtime exports", () => {
    // Types (ModelRegistryEntry, QueryLoggerOptions) are erased at runtime, so
    // only the value exports appear here. This guards against accidental
    // additions/removals to the public surface.
    expect(Object.keys(core).sort()).toEqual(
      [
        "ModelRegistry",
        "ModelRegistryError",
        "QueryLogger",
        "configureQueryLogger",
        "getQueryLogger",
        "setQueryLogger",
      ].sort(),
    );
  });
});
