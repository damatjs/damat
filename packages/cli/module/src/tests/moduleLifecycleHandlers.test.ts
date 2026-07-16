import { describe, expect, mock, test } from "bun:test";
import { createModuleListHandler } from "../commands/module/list/handler";
import { createModuleRemoveHandler } from "../commands/module/remove/handler";
import { createModuleUpdateHandler } from "../commands/module/update/handler";
import { createContext } from "./helpers";
import { artifact, lock, manifest, plan, record } from "./fixtures/installer";

function resolved(cleanup = mock(() => {})) {
  return {
    artifact: artifact(cleanup), provider: manifest(), plan: plan("update"), options: {},
    recipe: { schemaVersion: 1 as const, id: "billing", kind: "module" },
  };
}

describe("module list handler", () => {
  test("reports empty and sorted module installations", async () => {
    const empty = createContext({});
    await createModuleListHandler(() => lock())(empty.ctx);
    expect(empty.logger.info).toHaveBeenCalledWith("No modules installed");
    const listed = createContext({});
    await createModuleListHandler(() => lock(
      record("module", "zeta"), record("kit", "ignored"), record("module", "alpha"),
    ))(listed.ctx);
    expect(listed.logger.info.mock.calls[0]?.[0]).toBe("alpha");
    expect(listed.logger.info.mock.calls[1]?.[0]).toBe("zeta");
  });
});

describe("module remove handler", () => {
  test("handles missing names, success, and failures", async () => {
    const empty = createContext({});
    expect((await createModuleRemoveHandler({} as never)(empty.ctx)).exitCode).toBe(1);
    const ready = createContext({ yes: true }, { args: ["billing"] });
    const create = mock(() => plan("remove"));
    const execute = mock(async () => {});
    const handler = createModuleRemoveHandler({
      readLock: mock(() => lock(record())), create, execute,
    } as never);
    expect((await handler(ready.ctx)).exitCode).toBe(0);
    expect(create.mock.calls[0]?.[0]).toHaveProperty("confirmModified", true);
    const failing = createModuleRemoveHandler({
      readLock: mock(() => lock()), create: mock(() => { throw new Error("bad"); }),
      execute,
    } as never);
    expect((await failing(ready.ctx)).exitCode).toBe(1);
  });
});

describe("module update handler", () => {
  test("rejects unknown and non-module records", async () => {
    const missing = createContext({}, { args: ["missing"] });
    const nonModule = createModuleUpdateHandler({
      readLock: mock(() => lock(record("kit", "missing"))),
    } as never);
    expect((await nonModule(missing.ctx)).exitCode).toBe(1);
  });

  test("updates from provenance, cleans up, and reports failures", async () => {
    const ready = createContext({}, { args: ["billing"] });
    const cleanup = mock(() => {});
    const build = mock(async () => resolved(cleanup));
    const execute = mock(async () => {});
    const handler = createModuleUpdateHandler({
      readLock: mock(() => lock(record())), build, execute,
    } as never);
    expect((await handler(ready.ctx)).exitCode).toBe(0);
    expect(build.mock.calls[0]?.[2]).toBe("update");
    expect(cleanup).toHaveBeenCalledTimes(1);
    const failing = createModuleUpdateHandler({
      readLock: mock(() => lock(record())),
      build: mock(async () => { throw new Error("bad"); }), execute,
    } as never);
    expect((await failing(ready.ctx)).exitCode).toBe(1);
  });
});
