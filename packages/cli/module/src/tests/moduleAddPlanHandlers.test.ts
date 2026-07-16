import { describe, expect, mock, test } from "bun:test";
import { createModuleAddHandler } from "../commands/module/add/handler";
import { createModulePlanHandler } from "../commands/module/plan";
import { createContext } from "./helpers";
import { artifact, manifest, plan } from "./fixtures/installer";

function resolved(cleanup = mock(() => {})) {
  return {
    artifact: artifact(cleanup), provider: manifest(), plan: plan(), options: {},
    recipe: { schemaVersion: 1 as const, id: "billing", kind: "module" },
  };
}

describe("module add handler", () => {
  test("rejects missing sources", async () => {
    const { ctx, logger } = createContext({});
    const handler = createModuleAddHandler({} as never);
    expect((await handler(ctx)).exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });

  test("executes add plans and always cleans artifacts", async () => {
    const cleanup = mock(() => {});
    const execute = mock(async () => {});
    const { ctx } = createContext({}, { args: ["source"] });
    const handler = createModuleAddHandler({
      build: mock(async () => resolved(cleanup)), execute, report: mock(() => {}),
    } as never);
    expect((await handler(ctx)).exitCode).toBe(0);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test("reports dry runs and failures", async () => {
    const report = mock(() => {});
    const dry = createContext({ "dry-run": true }, { args: ["source"] });
    const handler = createModuleAddHandler({
      build: mock(async () => resolved()), execute: mock(async () => {}), report,
    } as never);
    expect((await handler(dry.ctx)).exitCode).toBe(0);
    expect(report).toHaveBeenCalledTimes(1);
    const failing = createModuleAddHandler({
      build: mock(async () => { throw new Error("bad"); }),
    } as never);
    expect((await failing(dry.ctx)).exitCode).toBe(1);
  });
});

describe("module plan handler", () => {
  test("handles missing sources, success, and errors", async () => {
    const empty = createContext({});
    expect((await createModulePlanHandler({} as never)(empty.ctx)).exitCode).toBe(1);
    const cleanup = mock(() => {});
    const ready = createContext({}, { args: ["source"] });
    const report = mock(() => {});
    const success = createModulePlanHandler({
      build: mock(async () => resolved(cleanup)), report,
    } as never);
    expect((await success(ready.ctx)).exitCode).toBe(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
    const failing = createModulePlanHandler({
      build: mock(async () => { throw new Error("bad"); }), report,
    } as never);
    expect((await failing(ready.ctx)).exitCode).toBe(1);
  });
});
