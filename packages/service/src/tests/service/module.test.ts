import { beforeEach, describe, expect, test } from "bun:test";
import { PoolManager } from "../../manager/pool";
import { ModuleService } from "../../service/module";
import { fakeModuleModel, initializeModuleService } from "./moduleContext";

describe("ModuleService construction", () => {
  beforeEach(() => PoolManager.reset());

  test("requires an initialized PoolManager", () => {
    const Base = ModuleService({
      models: { User: fakeModuleModel("user") },
    });
    expect(() => new (Base as never)()).toThrow(
      "PoolManager not initialized. Call PoolManager.setup(pool) before creating service instances.",
    );
  });

  test("registers every model and exposes definitions", () => {
    const em = initializeModuleService();
    const user = fakeModuleModel("user");
    const post = fakeModuleModel("post");
    const Base = ModuleService({ models: { User: user, Post: post } });
    const service = new (Base as never)() as InstanceType<typeof Base>;
    expect(em.registerModel).toHaveBeenCalledTimes(2);
    expect(em.registered.map(({ name }) => name)).toEqual(["User", "Post"]);
    expect(service.models).toEqual([user, post]);
    expect(service.getModels).toEqual([user, post]);
  });

  test("exposes the entity manager and inactive transaction state", () => {
    const em = initializeModuleService();
    const Base = ModuleService({
      models: { User: fakeModuleModel("user") },
    });
    const service = new (Base as never)() as InstanceType<typeof Base>;
    expect(service.em).toBe(em);
    expect(service.inTransaction).toBe(false);
  });
});
