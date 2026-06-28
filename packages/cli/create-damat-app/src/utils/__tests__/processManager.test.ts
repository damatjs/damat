import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
} from "bun:test";
import ProcessManager from "../commands/manager";

describe("ProcessManager", () => {
  afterEach(() => {
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  describe("constructor / onTerminated", () => {
    it("should register SIGTERM and SIGINT listeners on construction", () => {
      const beforeSigterm = process.listenerCount("SIGTERM");
      const beforeSigint = process.listenerCount("SIGINT");

      new ProcessManager();

      expect(process.listenerCount("SIGTERM")).toBe(beforeSigterm + 1);
      expect(process.listenerCount("SIGINT")).toBe(beforeSigint + 1);
    });

    it("should add a listener per onTerminated call (both signals)", () => {
      const pm = new ProcessManager();
      const beforeSigterm = process.listenerCount("SIGTERM");
      const beforeSigint = process.listenerCount("SIGINT");

      pm.onTerminated(() => {});

      expect(process.listenerCount("SIGTERM")).toBe(beforeSigterm + 1);
      expect(process.listenerCount("SIGINT")).toBe(beforeSigint + 1);
    });

    it("should invoke the registered callback on SIGINT", async () => {
      const pm = new ProcessManager();
      const fn = mock(() => {});
      pm.onTerminated(fn);

      process.emit("SIGINT");
      // listeners are async (wrapped in `async () => fn()`)
      await new Promise((r) => setTimeout(r, 0));

      expect(fn).toHaveBeenCalled();
    });
  });

  describe("addInterval", () => {
    it("should track intervals", () => {
      const pm = new ProcessManager();
      pm.addInterval(1 as any);
      pm.addInterval(2 as any);
      expect(pm.intervals).toEqual([1, 2] as any);
    });

    it("should clearInterval for each tracked interval on termination", async () => {
      const clearSpy = mock((_h: any) => {});
      const origClear = globalThis.clearInterval;
      globalThis.clearInterval = clearSpy as any;
      try {
        const pm = new ProcessManager();
        pm.addInterval(101 as any);
        pm.addInterval(202 as any);

        process.emit("SIGTERM");
        await new Promise((r) => setTimeout(r, 0));

        expect(clearSpy).toHaveBeenCalledWith(101 as any);
        expect(clearSpy).toHaveBeenCalledWith(202 as any);
      } finally {
        globalThis.clearInterval = origClear;
      }
    });
  });

  describe("MAX_RETRIES", () => {
    it("should be 3", () => {
      expect(ProcessManager.MAX_RETRIES).toBe(3);
    });
  });

  describe("runProcess", () => {
    it("should return the process result on success", async () => {
      const pm = new ProcessManager();
      const result = await pm.runProcess({
        process: async () => "ok",
      });
      expect(result).toBe("ok");
    });

    it("should call the process exactly once on success", async () => {
      const pm = new ProcessManager();
      const fn = mock(async () => "done");
      await pm.runProcess({ process: fn });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should rethrow a non-EAGAIN, non-ERESOLVE error", async () => {
      const pm = new ProcessManager();
      const fn = mock(async () => {
        throw new Error("boom");
      });
      await expect(pm.runProcess({ process: fn })).rejects.toThrow("boom");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on EAGAIN up to MAX_RETRIES then give up", async () => {
      const pm = new ProcessManager();
      const fn = mock(async () => {
        const err: any = new Error("again");
        err.code = "EAGAIN";
        throw err;
      });

      const result = await pm.runProcess({ process: fn });

      // Loop runs once, then retries while retries <= MAX_RETRIES(3).
      // retries: 1 (initial) -> error -> 2,3,4 ... stops when retries > 3.
      // That yields 4 total attempts and resolves to undefined (no throw).
      expect(result).toBeUndefined();
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it("should succeed on a later attempt after transient EAGAIN", async () => {
      const pm = new ProcessManager();
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts < 3) {
          const err: any = new Error("again");
          err.code = "EAGAIN";
          throw err;
        }
        return "recovered";
      });

      const result = await pm.runProcess({ process: fn });
      expect(result).toBe("recovered");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should swallow ERESOLVE errors when ignoreERESOLVE is true", async () => {
      const pm = new ProcessManager();
      const fn = mock(async () => {
        const err: any = new Error("resolve");
        err.code = "ERESOLVE";
        throw err;
      });

      const result = await pm.runProcess({
        process: fn,
        ignoreERESOLVE: true,
      });

      // ERESOLVE is ignored (not a processError), loop exits -> undefined
      expect(result).toBeUndefined();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should rethrow ERESOLVE when ignoreERESOLVE is false", async () => {
      const pm = new ProcessManager();
      const fn = mock(async () => {
        const err: any = new Error("resolve");
        err.code = "ERESOLVE";
        throw err;
      });

      await expect(pm.runProcess({ process: fn })).rejects.toThrow("resolve");
    });

    it("should rethrow errors that are not objects", async () => {
      const pm = new ProcessManager();
      const fn = mock(async () => {
        throw "string error";
      });
      await expect(pm.runProcess({ process: fn })).rejects.toBe("string error");
    });
  });
});
