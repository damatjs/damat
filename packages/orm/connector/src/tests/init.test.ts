import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { initPool, getPool, hasPool, clearPool } from "..";

describe("initPool", () => {
  beforeEach(() => {
    clearPool();
  });

  afterEach(() => {
    clearPool();
  });

  it("should initialize pool with string config", async () => {
    const config = "postgres://test:test@localhost:5432/test";
    const pool = await initPool(config);
    expect(pool).toBeDefined();
    expect(hasPool()).toBe(true);
    expect(getPool()).toBe(pool);
  });

  it("should return existing pool if already initialized", async () => {
    const config = "postgres://test:test@localhost:5432/test";
    const pool1 = await initPool(config);
    const pool2 = await initPool(config);
    expect(pool1).toBe(pool2);
  });

  it("should initialize pool with object config", async () => {
    const config = {
      host: "localhost",
      port: 5432,
      user: "test",
      password: "test",
      database: "test",
    };
    const pool = await initPool(config);
    expect(pool).toBeDefined();
    expect(hasPool()).toBe(true);
  });
});
