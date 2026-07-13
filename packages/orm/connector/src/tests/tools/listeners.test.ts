import { describe, it, expect, beforeEach, spyOn } from "bun:test";
import { setupPoolListeners } from "../../tools/listeners";
import { Logger } from "@damatjs/logger";
import { FakePool, StubLogger } from "../helpers/fakePool";
import type { Pool } from "@damatjs/orm-type";

describe("setupPoolListeners", () => {
  let pool: FakePool;
  let logger: StubLogger;

  beforeEach(() => {
    pool = new FakePool();
    logger = new StubLogger();
    setupPoolListeners(pool as unknown as Pool, logger);
  });

  describe("registration", () => {
    it("should register all five event listeners on the pool", () => {
      const names = pool.eventNames();
      expect(names).toContain("error");
      expect(names).toContain("connect");
      expect(names).toContain("acquire");
      expect(names).toContain("release");
      expect(names).toContain("remove");
    });

    it("should register exactly one handler per event", () => {
      expect(pool.listenerCount("error")).toBe(1);
      expect(pool.listenerCount("connect")).toBe(1);
      expect(pool.listenerCount("acquire")).toBe(1);
      expect(pool.listenerCount("release")).toBe(1);
      expect(pool.listenerCount("remove")).toBe(1);
    });

    it("should not log anything at registration time", () => {
      expect(logger.calls.debug).toHaveLength(0);
      expect(logger.calls.error).toHaveLength(0);
    });
  });

  describe("event handlers", () => {
    it("should log debug on connect event", () => {
      pool.emit("connect");
      expect(logger.messages("debug")).toEqual([
        "New client connected to pool",
      ]);
    });

    it("should log debug on acquire event", () => {
      pool.emit("acquire");
      expect(logger.messages("debug")).toEqual(["Client acquired from pool"]);
    });

    it("should log debug on release event", () => {
      pool.emit("release");
      expect(logger.messages("debug")).toEqual([
        "Client released back to pool",
      ]);
    });

    it("should log debug on remove event", () => {
      pool.emit("remove");
      expect(logger.messages("debug")).toEqual(["Client removed from pool"]);
    });

    it("should log error with the error message on error event", () => {
      const err = new Error("boom");
      pool.emit("error", err);
      expect(logger.calls.error).toHaveLength(1);
      expect(logger.calls.error[0]!.message).toBe("PostgreSQL pool error");
      // Source passes `{ error: err.message }` as the 2nd positional arg,
      // which is ILogger.error's `error` slot (not `context`).
      expect(logger.calls.error[0]!.error).toEqual({ error: "boom" });
    });

    it("should not emit debug logs when only an error fires", () => {
      pool.emit("error", new Error("x"));
      expect(logger.calls.debug).toHaveLength(0);
    });

    it("should log each event independently across multiple emissions", () => {
      pool.emit("connect");
      pool.emit("acquire");
      pool.emit("release");
      pool.emit("remove");
      expect(logger.messages("debug")).toEqual([
        "New client connected to pool",
        "Client acquired from pool",
        "Client released back to pool",
        "Client removed from pool",
      ]);
    });
  });

  describe("with a real Logger (spied)", () => {
    it("should call Logger.debug / Logger.error on the underlying methods", () => {
      const realLogger = new Logger({ level: "debug" });
      const debugSpy = spyOn(realLogger, "debug").mockImplementation(() => {});
      const errorSpy = spyOn(realLogger, "error").mockImplementation(() => {});
      const realPool = new FakePool();

      setupPoolListeners(realPool as unknown as Pool, realLogger);

      realPool.emit("connect");
      realPool.emit("error", new Error("kaput"));

      expect(debugSpy).toHaveBeenCalledWith("New client connected to pool");
      expect(errorSpy).toHaveBeenCalledWith("PostgreSQL pool error", {
        error: "kaput",
      });

      debugSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
