import { describe, it, expect } from "bun:test";
import {
  productionPoolConfig,
  developmentPoolConfig,
  testPoolConfig,
} from "../../tools/config";

describe("productionPoolConfig", () => {
  it("returns the production defaults", () => {
    expect(productionPoolConfig()).toEqual({
      min: 2,
      max: 20,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: false,
    });
  });

  it("merges overrides over the defaults", () => {
    const config = productionPoolConfig({ max: 50, allowExitOnIdle: true });
    expect(config.max).toBe(50);
    expect(config.allowExitOnIdle).toBe(true);
    expect(config.min).toBe(2);
  });
});

describe("developmentPoolConfig", () => {
  it("returns the development defaults", () => {
    expect(developmentPoolConfig()).toEqual({
      min: 1,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });
  });

  it("merges overrides over the defaults", () => {
    const config = developmentPoolConfig({ min: 3 });
    expect(config.min).toBe(3);
    expect(config.max).toBe(5);
  });
});

describe("testPoolConfig", () => {
  it("returns the test defaults", () => {
    expect(testPoolConfig()).toEqual({
      min: 0,
      max: 2,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 1000,
    });
  });

  it("merges overrides over the defaults", () => {
    const config = testPoolConfig({ connectionTimeoutMillis: 100 });
    expect(config.connectionTimeoutMillis).toBe(100);
    expect(config.max).toBe(2);
  });
});
