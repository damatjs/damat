import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Pool } from "@damatjs/deps/pg";
import { setupPoolListeners } from "../../tools/listeners";
import { Logger } from "@damatjs/logger";

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

describe("setupPoolListeners", () => {
    let pool: Pool;
    let logger: Logger;

    beforeEach(async () => {
        logger = new Logger({ level: "debug" });

        const config = getTestConfig();
        pool = new Pool(config);
        setupPoolListeners(pool, logger);
    });

    afterEach(async () => {
        if (pool) {
            await pool.end();
        }
    });

    it("should register all event listeners on pool", () => {
        expect(pool.eventNames()).toContain("error");
        expect(pool.eventNames()).toContain("connect");
        expect(pool.eventNames()).toContain("acquire");
        expect(pool.eventNames()).toContain("release");
        expect(pool.eventNames()).toContain("remove");
    });

    it("should log debug on connect event when client connects", async () => {
        const client = await pool.connect();
        client.release();
    });

    it("should log debug on acquire event", async () => {
        const client = await pool.connect();
        client.release();
    });

    it("should log debug on release event", async () => {
        const client = await pool.connect();
        client.release();
    });
});
