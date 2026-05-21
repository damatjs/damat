import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ConnectionManager } from "../index";
import { ConnectionError } from "../tools";
import { Logger } from "@damatjs/logger";
import type { DbPoolConfigWithExtras } from "@damatjs/orm-type";

const getTestConfig = (): DbPoolConfigWithExtras => {
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

describe("ConnectionManager", () => {
    let connectionManager: ConnectionManager;
    let logger: Logger;
    const config = getTestConfig();

    beforeEach(() => {
        logger = new Logger({ level: "debug" });
    });

    afterEach(async () => {
        if (connectionManager) {
            await connectionManager.disconnect();
        }
        connectionManager = new ConnectionManager(config);
    });

    describe("constructor", () => {
        it("should create instance with config", () => {
            connectionManager = new ConnectionManager(config);
            expect(connectionManager).toBeInstanceOf(ConnectionManager);
            expect(connectionManager.isInitialized()).toBe(false);
        });

        it("should create instance with real logger", () => {
            connectionManager = new ConnectionManager(config, logger);
            expect(connectionManager).toBeInstanceOf(ConnectionManager);
        });
    });

    describe("connect", () => {
        beforeEach(() => {
            connectionManager = new ConnectionManager(config, logger);
        });

        it("should establish connection", async () => {
            const pool = await connectionManager.connect();
            expect(pool).toBeDefined();
            expect(connectionManager.isInitialized()).toBe(true);
        });

        it("should return existing pool if already connected", async () => {
            const pool1 = await connectionManager.connect();
            const pool2 = await connectionManager.connect();
            expect(pool1).toBe(pool2);
        });

        it("should be idempotent - multiple calls return same pool", async () => {
            const results = await Promise.all([
                connectionManager.connect(),
                connectionManager.connect(),
                connectionManager.connect(),
            ]);
            expect(results[0]).toBe(results[1]);
            expect(results[1]).toBe(results[2]);
        });
    });

    describe("disconnect", () => {
        beforeEach(() => {
            connectionManager = new ConnectionManager(config, logger);
        });

        it("should close connection", async () => {
            await connectionManager.connect();
            expect(connectionManager.isInitialized()).toBe(true);
            await connectionManager.disconnect();
            expect(connectionManager.isInitialized()).toBe(false);
        });

        it("should be safe to call when not connected", async () => {
            await expect(connectionManager.disconnect()).resolves.toBeUndefined();
        });

        it("should allow reconnection after disconnect", async () => {
            await connectionManager.connect();
            await connectionManager.disconnect();
            await connectionManager.connect();
            expect(connectionManager.isInitialized()).toBe(true);
        });
    });

    describe("getPool", () => {
        beforeEach(() => {
            connectionManager = new ConnectionManager(config, logger);
        });

        it("should throw ConnectionError when not connected", () => {
            expect(() => connectionManager.getPool()).toThrow(ConnectionError);
            expect(() => connectionManager.getPool()).toThrow("Not connected to database");
        });

        it("should return pool when connected", async () => {
            await connectionManager.connect();
            const pool = connectionManager.getPool();
            expect(pool).toBeDefined();
        });
    });

    describe("getPoolStats", () => {
        beforeEach(() => {
            connectionManager = new ConnectionManager(config, logger);
        });

        it("should return zero stats when not connected", () => {
            const stats = connectionManager.getPoolStats();
            expect(stats).toEqual({
                totalCount: 0,
                idleCount: 0,
                waitingCount: 0,
            });
        });

        it("should return pool stats when connected", async () => {
            await connectionManager.connect();
            const stats = connectionManager.getPoolStats();
            expect(typeof stats.totalCount).toBe("number");
            expect(typeof stats.idleCount).toBe("number");
            expect(typeof stats.waitingCount).toBe("number");
        });
    });

    describe("getClient", () => {
        beforeEach(() => {
            connectionManager = new ConnectionManager(config, logger);
        });

        it("should throw ConnectionError when not connected", async () => {
            await expect(connectionManager.getClient()).rejects.toThrow(ConnectionError);
        });

        it("should return client when connected", async () => {
            await connectionManager.connect();
            const client = await connectionManager.getClient();
            expect(client).toBeDefined();
            expect(client.query).toBeDefined();
            expect(client.release).toBeDefined();
            client.release();
        });
    });

    describe("healthCheck", () => {
        beforeEach(() => {
            connectionManager = new ConnectionManager(config, logger);
        });

        it("should return disconnected status when not connected", async () => {
            const status = await connectionManager.healthCheck();
            expect(status.connected).toBe(false);
            expect(status.poolStats).toEqual({
                totalCount: 0,
                idleCount: 0,
                waitingCount: 0,
            });
            expect(status.lastChecked).toBeInstanceOf(Date);
        });

        it("should return connected status when connected", async () => {
            await connectionManager.connect();
            const status = await connectionManager.healthCheck();
            expect(status.connected).toBe(true);
            expect(typeof status.poolStats.totalCount).toBe("number");
            expect(status.lastChecked).toBeInstanceOf(Date);
        });
    });

    describe("isInitialized", () => {
        beforeEach(() => {
            connectionManager = new ConnectionManager(config, logger);
        });

        it("should return false initially", () => {
            expect(connectionManager.isInitialized()).toBe(false);
        });

        it("should return true after connect", async () => {
            await connectionManager.connect();
            expect(connectionManager.isInitialized()).toBe(true);
        });

        it("should return false after disconnect", async () => {
            await connectionManager.connect();
            await connectionManager.disconnect();
            expect(connectionManager.isInitialized()).toBe(false);
        });
    });

    describe("real database operations", () => {
        beforeEach(() => {
            connectionManager = new ConnectionManager(config, logger);
        });

        it("should execute queries through acquired client", async () => {
            await connectionManager.connect();
            const client = await connectionManager.getClient();
            const result = await client.query("SELECT 1 as num");
            expect(result.rows).toBeDefined();
            expect(result.rows[0].num).toBe(1);
            client.release();
        });

        it("should handle multiple clients from pool", async () => {
            await connectionManager.connect();
            const client1 = await connectionManager.getClient();
            const client2 = await connectionManager.getClient();
            
            const [r1, r2] = await Promise.all([
                client1.query("SELECT 1 as num"),
                client2.query("SELECT 2 as num"),
            ]);
            
            expect(r1.rows[0].num).toBe(1);
            expect(r2.rows[0].num).toBe(2);
            
            client1.release();
            client2.release();
        });
    });
});
