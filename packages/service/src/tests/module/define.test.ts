import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { getLogger } from "@damatjs/logger";
import { defineModule } from "../../module/define";

/**
 * Tests reflect the CURRENT behavior of `defineModule`:
 *   - `definition.credentials` is a FUNCTION `(env) => parsed` (NOT `{ schema, load }`).
 *   - Credentials are parsed eagerly at definition time.
 *   - The service instance is created LAZILY on first property access via a Proxy.
 *   - `init()` always (re)creates a fresh instance.
 */
describe("defineModule", () => {
  const originalEnv = { ...process.env };
  let logSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // `defineModule.init` logs "instance setup" via the global logger at debug
    // level; silence + assert it.
    logSpy = spyOn(getLogger(), "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    logSpy.mockRestore();
  });

  describe("module instance shape", () => {
    it("exposes the provided name", () => {
      const mod = defineModule<{ ping(): string }>("payments", {
        credentials: () => ({}),
        service: class {
          ping() {
            return "pong";
          }
        },
      });
      expect(mod.name).toBe("payments");
    });

    it("returns the eagerly-parsed credentials on the instance", () => {
      const mod = defineModule<{ credentials: unknown }>("svc", {
        credentials: (env) => ({ apiKey: env.SVC_KEY ?? "default" }),
        service: class {
          constructor(public credentials: unknown) {}
        },
      });
      expect(mod.credentials).toEqual({ apiKey: "default" });
    });

    it("reads from process.env when computing credentials", () => {
      process.env.MY_TOKEN = "from-env";
      const mod = defineModule<{ credentials: unknown }>("svc", {
        credentials: (env) => ({ token: env.MY_TOKEN }),
        service: class {
          constructor(public credentials: unknown) {}
        },
      });
      expect(mod.credentials).toEqual({ token: "from-env" });
    });

    it("evaluates the credentials function exactly once at definition time", () => {
      let calls = 0;
      const mod = defineModule<{ noop(): void }>("svc", {
        credentials: () => {
          calls++;
          return {};
        },
        service: class {
          noop() {}
        },
      });
      expect(calls).toBe(1);
      // Touching the service later must NOT re-run the credentials loader.
      mod.service.noop();
      mod.init();
      expect(calls).toBe(1);
    });
  });

  describe("lazy initialization via proxy", () => {
    it("does not construct the service until a property is accessed", () => {
      let ctor = 0;
      const mod = defineModule<{ value: number }>("svc", {
        credentials: () => ({}),
        service: class {
          value = 7;
          constructor() {
            ctor++;
          }
        },
      });
      expect(ctor).toBe(0);
      // First access triggers construction.
      expect(mod.service.value).toBe(7);
      expect(ctor).toBe(1);
    });

    it("reuses the same lazily-created instance across accesses", () => {
      let ctor = 0;
      const mod = defineModule<{ value: number }>("svc", {
        credentials: () => ({}),
        service: class {
          value = 1;
          constructor() {
            ctor++;
          }
        },
      });
      void mod.service.value;
      void mod.service.value;
      void mod.service.value;
      expect(ctor).toBe(1);
    });

    it("passes parsed credentials to the service constructor", () => {
      const mod = defineModule<{ getKey(): string }>("svc", {
        credentials: () => ({ apiKey: "k-123" }),
        service: class {
          constructor(public credentials: { apiKey: string }) {}
          getKey() {
            return this.credentials.apiKey;
          }
        },
      });
      expect(mod.service.getKey()).toBe("k-123");
    });
  });

  describe("proxy get/set behavior", () => {
    it("binds methods to the underlying instance (preserves `this`)", () => {
      const mod = defineModule<{ getCount(): number; bump(): void }>("svc", {
        credentials: () => ({}),
        service: class {
          private count = 0;
          bump() {
            this.count++;
          }
          getCount() {
            return this.count;
          }
        },
      });
      // Detach the method from the proxy; binding must keep it working.
      const bump = mod.service.bump;
      bump();
      bump();
      expect(mod.service.getCount()).toBe(2);
    });

    it("returns non-function properties directly", () => {
      const mod = defineModule<{ label: string }>("svc", {
        credentials: () => ({}),
        service: class {
          label = "hello";
        },
      });
      expect(mod.service.label).toBe("hello");
      expect(typeof mod.service.label).toBe("string");
    });

    it("writes through the proxy to the underlying instance", () => {
      const mod = defineModule<{ count: number }>("svc", {
        credentials: () => ({}),
        service: class {
          count = 0;
        },
      });
      mod.service.count = 42;
      expect(mod.service.count).toBe(42);
    });

    it("lazily constructs on a set as well as a get", () => {
      let ctor = 0;
      const mod = defineModule<{ flag: boolean }>("svc", {
        credentials: () => ({}),
        service: class {
          flag = false;
          constructor() {
            ctor++;
          }
        },
      });
      expect(ctor).toBe(0);
      mod.service.flag = true;
      expect(ctor).toBe(1);
      expect(mod.service.flag).toBe(true);
    });
  });

  describe("init()", () => {
    it("creates a fresh instance, discarding prior state", () => {
      let ctor = 0;
      const mod = defineModule<{ value: number }>("svc", {
        credentials: () => ({}),
        service: class {
          value = 1;
          constructor() {
            ctor++;
          }
        },
      });
      mod.service.value = 99; // construct + mutate
      expect(ctor).toBe(1);
      mod.init(); // re-create
      expect(ctor).toBe(2);
      expect(mod.service.value).toBe(1); // reset to constructor default
    });

    it("logs the module name on (re)initialization", () => {
      const mod = defineModule<{ noop(): void }>("loggable", {
        credentials: () => ({}),
        service: class {
          noop() {}
        },
      });
      mod.init();
      expect(logSpy).toHaveBeenCalledWith("instance setup", {
        module: "loggable",
      });
    });
  });

  describe("credential loader errors", () => {
    it("propagates errors thrown by the credentials loader at definition time", () => {
      expect(() =>
        defineModule<{ noop(): void }>("svc", {
          credentials: () => {
            throw new Error("missing env");
          },
          service: class {
            noop() {}
          },
        }),
      ).toThrow("missing env");
    });
  });
});
