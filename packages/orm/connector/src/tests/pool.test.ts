import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createPool, getPoolStats } from "..";

describe("pool utilities", () => {
  let pool: any;

  beforeEach(() => {
    pool = null;
  });

  afterEach(() => {
    if (pool) pool.end();
  });

  it("should create pool from string config", () => {
    pool = createPool("postgres://test:test@localhost:5432/test");
    expect(pool).toBeDefined();
    expect(pool.end).toBeFunction();
  });

  it("should create pool from object config", () => {
    pool = createPool({
      host: "localhost",
      port: 5432,
      user: "test",
      password: "test",
      database: "test",
    });
    expect(pool).toBeDefined();
  });

  it("should get pool stats", () => {
    pool = createPool({
      host: "localhost",
      port: 5432,
      user: "test",
      password: "test",
      database: "test",
    });
    const stats = getPoolStats(pool);
    expect(stats).toHaveProperty("totalCount");
    expect(stats).toHaveProperty("idleCount");
    expect(stats).toHaveProperty("waitingCount");
  });
});
