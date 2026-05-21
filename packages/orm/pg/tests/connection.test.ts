import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Pool } from "@damatjs/deps/pg";
import { ConnectionManager } from "../src/connection";

const DATABASE_URL = "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable";

describe("ConnectionManager", () => {
  let connectionManager: ConnectionManager;
  let pool: Pool;

  beforeAll(async () => {
    connectionManager = new ConnectionManager(DATABASE_URL);
    pool = await connectionManager.connect();
  });

  afterAll(async () => {
    await connectionManager.disconnect();
  });

  test("connects to PostgreSQL", async () => {
    const client = await pool.connect();
    const result = await client.query("SELECT version()");
    client.release();
    expect(result.rows[0].version).toBeDefined();
  });

  test("healthCheck returns connected status", async () => {
    const status = await connectionManager.healthCheck();
    expect(status.connected).toBe(true);
    expect(status.poolStats.totalCount).toBeGreaterThanOrEqual(0);
  });

  test("getPool returns valid pool", () => {
    const p = connectionManager.getPool();
    expect(p).toBeDefined();
  });

  test("isInitialized returns true after connect", () => {
    expect(connectionManager.isInitialized()).toBe(true);
  });

  test("getPoolStats returns pool statistics", () => {
    const stats = connectionManager.getPoolStats();
    expect(stats).toHaveProperty("totalCount");
    expect(stats).toHaveProperty("idleCount");
    expect(stats).toHaveProperty("waitingCount");
  });

  test("getClient returns a pool client", async () => {
    const client = await connectionManager.getClient();
    const result = await client.query("SELECT 1 as num");
    client.release();
    expect(result.rows[0].num).toBe(1);
  });
});

describe("ConnectionManager with pre-existing pool", () => {
  let externalPool: Pool;
  let connectionManager: ConnectionManager;

  beforeAll(async () => {
    externalPool = new Pool({ connectionString: DATABASE_URL });
    connectionManager = new ConnectionManager(externalPool);
    await connectionManager.connect();
  });

  afterAll(async () => {
    await connectionManager.disconnect();
  });

  test("uses external pool without closing it", async () => {
    const status = await connectionManager.healthCheck();
    expect(status.connected).toBe(true);
    
    await connectionManager.disconnect();
    
    const client = await externalPool.connect();
    const result = await client.query("SELECT 1");
    client.release();
    expect(result.rows[0]["?column?"]).toBe(1);
    
    await externalPool.end();
  });
});
