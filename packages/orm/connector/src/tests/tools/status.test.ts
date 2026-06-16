import { describe, it, expect } from "bun:test";
import { fetchPoolStats, performHealthCheck } from "../../tools/status";
import { FakePool, FakePoolClient } from "../helpers/fakePool";
import type { Pool } from "@damatjs/orm-type";

describe("fetchPoolStats", () => {
    it("should return zero stats when pool is null", () => {
        expect(fetchPoolStats(null)).toEqual({
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        });
    });

    it("should read the counters from the pool", () => {
        const pool = new FakePool({ totalCount: 5, idleCount: 3, waitingCount: 2 });
        expect(fetchPoolStats(pool as unknown as Pool)).toEqual({
            totalCount: 5,
            idleCount: 3,
            waitingCount: 2,
        });
    });

    it("should default missing/undefined counters to 0", () => {
        const mockPool = {
            totalCount: undefined,
            idleCount: undefined,
            waitingCount: undefined,
        } as unknown as Pool;
        expect(fetchPoolStats(mockPool)).toEqual({
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        });
    });

    it("should keep a zero counter as zero (not coerce via ??)", () => {
        const pool = new FakePool({ totalCount: 0, idleCount: 0, waitingCount: 0 });
        expect(fetchPoolStats(pool as unknown as Pool)).toEqual({
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
        });
    });
});

describe("performHealthCheck", () => {
    it("should return disconnected status for a null pool and call updateStatus(false)... but it does NOT", async () => {
        // NOTE: documents current source behavior — for a null pool the helper
        // returns early and never invokes updateStatus.
        let called = false;
        let value: boolean | undefined;
        const updateStatus = (connected: boolean) => { called = true; value = connected; };

        const status = await performHealthCheck(null, updateStatus);

        expect(status.connected).toBe(false);
        expect(status.poolStats).toEqual({ totalCount: 0, idleCount: 0, waitingCount: 0 });
        expect(status.lastChecked).toBeInstanceOf(Date);
        // updateStatus is NOT called on the null-pool path (early return).
        expect(called).toBe(false);
        expect(value).toBeUndefined();
    });

    it("should report connected and run SELECT 1 on the happy path", async () => {
        const client = new FakePoolClient();
        const pool = new FakePool({ client, idleCount: 1 });
        let value: boolean | undefined;
        const updateStatus = (connected: boolean) => { value = connected; };

        const status = await performHealthCheck(pool as unknown as Pool, updateStatus);

        expect(status.connected).toBe(true);
        expect(value).toBe(true);
        expect(status.lastChecked).toBeInstanceOf(Date);
        // The probe issued exactly one "SELECT 1" query...
        expect(client.queries).toHaveLength(1);
        expect(client.queries[0]).toEqual(["SELECT 1"]);
        // ...and released the client back to the pool.
        expect(client.released).toBe(true);
        // Stats are re-read from the (now connected) pool.
        expect(status.poolStats.totalCount).toBe(1); // connect() incremented totalCount
        expect(status.poolStats.idleCount).toBe(1);
    });

    it("should report disconnected when connect() fails", async () => {
        const pool = new FakePool({ connectError: new Error("ECONNREFUSED") });
        let value: boolean | undefined;
        const updateStatus = (connected: boolean) => { value = connected; };

        const status = await performHealthCheck(pool as unknown as Pool, updateStatus);

        expect(status.connected).toBe(false);
        expect(value).toBe(false);
        expect(status.lastChecked).toBeInstanceOf(Date);
        // On failure the original (pre-connect) stats snapshot is returned.
        expect(status.poolStats).toEqual({ totalCount: 0, idleCount: 0, waitingCount: 0 });
    });

    it("should report disconnected when the SELECT 1 query fails", async () => {
        const client = new FakePoolClient({
            queryImpl: async () => { throw new Error("query timeout"); },
        });
        const pool = new FakePool({ client });
        let value: boolean | undefined;
        const updateStatus = (connected: boolean) => { value = connected; };

        const status = await performHealthCheck(pool as unknown as Pool, updateStatus);

        expect(status.connected).toBe(false);
        expect(value).toBe(false);
        // The query was attempted before failing.
        expect(client.queries).toHaveLength(1);
    });

    it("should not throw even if the underlying error is not an Error instance", async () => {
        const client = new FakePoolClient({
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            queryImpl: async () => { throw "string failure"; },
        });
        const pool = new FakePool({ client });

        const status = await performHealthCheck(pool as unknown as Pool, () => {});
        expect(status.connected).toBe(false);
    });
});
