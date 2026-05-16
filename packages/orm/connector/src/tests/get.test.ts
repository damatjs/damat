import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getConnection, setPool, clearPool } from "../index";

describe("getConnection", () => {
  beforeEach(() => {
    clearPool();
  });

  afterEach(() => {
    clearPool();
  });

  it("should throw if pool not initialized", () => {
    expect(() => getConnection()).toThrow(
      "Database connection not initialized. Call initConnection() first."
    );
  });

  it("should return pool if initialized", () => {
    const mockPool = {} as any;
    setPool(mockPool);
    expect(getConnection()).toBe(mockPool);
  });
});
