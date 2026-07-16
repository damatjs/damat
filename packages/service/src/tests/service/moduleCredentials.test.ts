import { beforeEach, describe, expect, test } from "bun:test";
import { z } from "@damatjs/deps/zod";
import { PoolManager } from "../../manager/pool";
import { ModuleService } from "../../service/module";
import { fakeModuleModel, initializeModuleService } from "./moduleContext";

describe("ModuleService credentials", () => {
  beforeEach(() => {
    PoolManager.reset();
    initializeModuleService();
  });

  test("parses valid credentials", () => {
    const Base = ModuleService({
      models: { User: fakeModuleModel("user") },
      credentialsSchema: z.object({ token: z.string(), retries: z.number() }),
    });
    const service = new (Base as never)({
      token: "abc",
      retries: 3,
    }) as InstanceType<typeof Base>;
    expect(service.credentials).toEqual({ token: "abc", retries: 3 });
  });

  test("rejects invalid credentials", () => {
    const Base = ModuleService({
      models: { User: fakeModuleModel("user") },
      credentialsSchema: z.object({ token: z.string() }),
    });
    expect(() => new (Base as never)({ token: 123 })).toThrow();
  });

  test("leaves credentials undefined without a schema", () => {
    const Base = ModuleService({
      models: { User: fakeModuleModel("user") },
    });
    const service = new (Base as never)() as InstanceType<typeof Base>;
    expect(service.credentials).toBeUndefined();
  });
});
