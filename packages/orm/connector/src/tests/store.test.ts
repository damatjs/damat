import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getPool, setPool, hasPool, clearPool } from "..";

describe("connection store", () => {
  beforeEach(() => {
    clearPool();
  });

  afterEach(() => {
    clearPool();
  });

  it("should start with no pool", () => {
    expect(hasPool()).toBe(false);
    expect(getPool()).toBeNull();
  });

  it("should set and get pool", () => {
    const mockPool = {} as any;
    setPool(mockPool);
    expect(hasPool()).toBe(true);
    expect(getPool()).toBe(mockPool);
  });

  it("should clear pool", () => {
    const mockPool = {} as any;
    setPool(mockPool);
    expect(hasPool()).toBe(true);
    clearPool();
    expect(hasPool()).toBe(false);
    expect(getPool()).toBeNull();
  });

  it("should allow setting null", () => {
    const mockPool = {} as any;
    setPool(mockPool);
    expect(hasPool()).toBe(true);
    setPool(null);
    expect(hasPool()).toBe(false);
  });
});
