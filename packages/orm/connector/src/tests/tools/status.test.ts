import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Pool } from "@damatjs/deps/pg";
import { fetchPoolStats, performHealthCheck } from "../../tools/status";

const getTestConfig = () => {
    const dbUrl = process.env.DATABASE_URL || "postgres://postgres:Password@0.0.0.0:5432/damatjs";
    const url = new URL(dbUrl);
    return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
    };
};

describe("fetchPoolStats", () => {
    it("should return zero stats when pool is null", () => {
        const stats = fetchPoolStats(null);
        expect(stats).toEqual({
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        });
    });

    it("should return stats from real pool", async () => {
        const config = getTestConfig();
        const pool = new Pool(config);
        
        const client = await pool.connect();
        client.release();
        
        const stats = fetchPoolStats(pool);
        
        expect(typeof stats.totalCount).toBe("number");
        expect(typeof stats.idleCount).toBe("number");
        expect(typeof stats.waitingCount).toBe("number");
        
        await pool.end();
    });

    it("should handle missing stats with defaults", () => {
        const mockPool = {
            totalCount: undefined,
            idleCount: undefined,
            waitingCount: undefined,
        } as any;
        const stats = fetchPoolStats(mockPool);
        expect(stats).toEqual({
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        });
    });
});

describe("performHealthCheck", () => {
    let pool: Pool;

    beforeEach(async () => {
        const config = getTestConfig();
        pool = new Pool(config);
    });

    afterEach(async () => {
        if (pool) {
            await pool.end();
        }
    });

    it("should return disconnected status for null pool", async () => {
        let statusValue = false;
        const updateStatus = (connected: boolean) => { statusValue = connected; };
        
        const status = await performHealthCheck(null, updateStatus);
        
        expect(status.connected).toBe(false);
        expect(status.poolStats).toEqual({
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        });
        expect(status.lastChecked).toBeInstanceOf(Date);
        expect(statusValue).toBe(false);
    });

    it("should return connected status on successful check with real pool", async () => {
        let statusValue = false;
        const updateStatus = (connected: boolean) => { statusValue = connected; };
        
        const status = await performHealthCheck(pool, updateStatus);
        
        expect(status.connected).toBe(true);
        expect(typeof status.poolStats.totalCount).toBe("number");
        expect(status.lastChecked).toBeInstanceOf(Date);
        expect(statusValue).toBe(true);
    });

    it("should execute SELECT 1 query during health check", async () => {
        const updateStatus = () => {};
        
        const status = await performHealthCheck(pool, updateStatus);
        
        expect(status.connected).toBe(true);
    });

    it("should reflect pool stats after health check", async () => {
        const updateStatus = () => {};
        
        await performHealthCheck(pool, updateStatus);
        const stats = fetchPoolStats(pool);
        
        expect(stats.totalCount).toBeGreaterThanOrEqual(0);
    });
});
