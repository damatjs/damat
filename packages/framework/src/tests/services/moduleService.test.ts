import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  registerModule,
  getModule,
  hasModule,
  clearModules,
  getAllModules,
  initModules,
} from "../../services/moduleService";
import type { ModuleConfig } from "../../config";

// Use the OS temp dir so the suite works on any machine (including CI), not a
// session-specific scratchpad path.
const SCRATCH = tmpdir();

let cwd: string;

beforeEach(() => {
  clearModules();
  cwd = mkdtempSync(join(SCRATCH, "damat-modules-"));
});

afterEach(() => {
  clearModules();
  rmSync(cwd, { recursive: true, force: true });
});

// A minimal fake ModuleInstance whose init() returns the service it exposes.
function fakeModule(service: unknown, onInit?: () => void) {
  return {
    service,
    init() {
      onInit?.();
      return service;
    },
  };
}

describe("registerModule / getModule / hasModule", () => {
  it("calls init() on register and exposes the service via getModule", () => {
    let initCalled = 0;
    const svc = { greet: () => "hi" };
    registerModule("greeter", fakeModule(svc, () => initCalled++) as never);

    expect(initCalled).toBe(1);
    expect(hasModule("greeter")).toBe(true);
    expect(getModule("greeter")).toBe(svc as never);
  });

  it("getModule returns null for an unregistered module", () => {
    expect(getModule("missing")).toBeNull();
    expect(hasModule("missing")).toBe(false);
  });

  it("clearModules removes all registered modules", () => {
    registerModule("a", fakeModule({}) as never);
    registerModule("b", fakeModule({}) as never);
    expect(getAllModules().size).toBe(2);

    clearModules();
    expect(getAllModules().size).toBe(0);
    expect(hasModule("a")).toBe(false);
  });

  it("propagates an error thrown by a module's init()", () => {
    const boom = new Error("init exploded");
    const broken = {
      service: {},
      init() {
        throw boom;
      },
    };
    expect(() => registerModule("broken", broken as never)).toThrow("init exploded");
    // registration aborted before the map was populated
    expect(hasModule("broken")).toBe(false);
  });
});

describe("initModules", () => {
  function writeModuleFile(name: string, body: string): string {
    const file = join(cwd, name);
    writeFileSync(file, body);
    return file;
  }

  it("imports the module, calls init(), and registers under basename when no id is given", async () => {
    writeModuleFile(
      "userModule.ts",
      `let inited = false;
       export default {
         service: { name: "user-service" },
         init() { inited = true; return this.service; },
       };`,
    );

    const config: ModuleConfig = { resolve: "userModule.ts" };
    await initModules([config], cwd);

    // basename of "userModule.ts" is "userModule.ts"
    expect(hasModule("userModule.ts")).toBe(true);
    expect(getModule("userModule.ts")).toEqual({ name: "user-service" } as never);
  });

  it("registers under the explicit id when provided (id overrides basename)", async () => {
    writeModuleFile(
      "thing.ts",
      `export default {
         service: { v: 1 },
         init() { return this.service; },
       };`,
    );

    await initModules([{ id: "custom-id", resolve: "thing.ts" }], cwd);

    expect(hasModule("custom-id")).toBe(true);
    expect(hasModule("thing.ts")).toBe(false);
  });

  it("throws when the default export has a non-function init", async () => {
    writeModuleFile(
      "badInit.ts",
      `export default { service: {}, init: "not a function" };`,
    );

    await expect(initModules([{ resolve: "badInit.ts" }], cwd)).rejects.toThrow(
      /must default-export the result of defineModule/,
    );
  });

  it("throws when there is no default export", async () => {
    writeModuleFile("noDefault.ts", `export const foo = 1;`);

    await expect(initModules([{ resolve: "noDefault.ts" }], cwd)).rejects.toThrow(
      /must default-export the result of defineModule/,
    );
  });

  it("propagates an error thrown during the module's init()", async () => {
    writeModuleFile(
      "throwingInit.ts",
      `export default {
         service: {},
         init() { throw new Error("module init failed"); },
       };`,
    );

    await expect(initModules([{ resolve: "throwingInit.ts" }], cwd)).rejects.toThrow(
      "module init failed",
    );
  });

  it("registers multiple modules in order", async () => {
    writeModuleFile("m1.ts", `export default { service: { id: 1 }, init() { return this.service; } };`);
    writeModuleFile("m2.ts", `export default { service: { id: 2 }, init() { return this.service; } };`);

    await initModules(
      [
        { id: "one", resolve: "m1.ts" },
        { id: "two", resolve: "m2.ts" },
      ],
      cwd,
    );

    expect(getAllModules().size).toBe(2);
    expect(getModule("one")).toEqual({ id: 1 } as never);
    expect(getModule("two")).toEqual({ id: 2 } as never);
  });
});
