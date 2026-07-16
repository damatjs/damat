import { describe, expect, mock, test } from "bun:test";
import { buildModuleInstallPlan } from "../commands/module/shared/plan";
import { executeModulePlan } from "../commands/module/shared/execute";
import { reportModulePlan } from "../commands/module/shared/report";
import { createContext } from "./helpers";
import { artifact, lock, manifest, plan, request } from "./fixtures/installer";

describe("module plan construction", () => {
  test("builds source add plans with provider backend support", async () => {
    const { ctx } = createContext({ yes: true });
    const expected = plan();
    const install = mock(() => expected);
    const resolved = {
      artifact: artifact(),
      provider: manifest(),
      recipe: { schemaVersion: 1, id: "billing", kind: "module" },
      options: { mode: "source" as const, packageBackend: "damat" as const },
    };
    const result = await buildModuleInstallPlan(ctx, "/source", "add", {
      resolve: mock(async () => resolved),
      install,
      update: mock(async () => expected),
      readLock: mock(() => lock()),
    });
    expect(result.plan).toBe(expected);
    expect(install.mock.calls[0]?.[0]).toMatchObject({
      mode: "source",
      packageBackend: "damat",
      confirmModified: true,
      supportedPackageBackends: ["node", "damat"],
    });
  });

  test("builds update plans with defaults", async () => {
    const { ctx } = createContext({ "experimental-package": true });
    const expected = plan("update");
    const update = mock(async () => expected);
    await buildModuleInstallPlan(ctx, request, "update", {
      resolve: mock(async () => ({
        artifact: artifact(),
        provider: { ...manifest(), install: undefined },
        recipe: { schemaVersion: 1, id: "billing", kind: "module" },
        options: {},
      })),
      install: mock(() => expected),
      update,
      readLock: mock(() => lock()),
    });
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      experimentalPackage: true,
    });
  });
});

describe("module plan reporting and execution", () => {
  test("reports add warnings, package backend, and custom instructions", () => {
    const { ctx, logger } = createContext({});
    const provider = manifest();
    provider.install!.instructions = { add: ["wire billing"] };
    reportModulePlan(ctx, plan(), provider);
    expect(logger.warn).toHaveBeenCalledWith("check usage");
    expect(logger.info).toHaveBeenCalledWith("wire billing");
  });

  test("reports default removal instructions", () => {
    const { ctx, logger } = createContext({});
    reportModulePlan(ctx, plan("remove"));
    expect(logger.info.mock.calls.flat().join(" ")).toContain("billing");
  });

  test("executes plans with the shared runtime", async () => {
    const { ctx } = createContext({});
    const execute = mock(async () => {});
    const runtime = { now: () => "now" };
    await executeModulePlan(ctx, plan(), manifest(), {
      execute: execute as never,
      runtime: mock(() => runtime as never),
    });
    expect(execute).toHaveBeenCalledWith(expect.anything(), runtime);
  });
});
