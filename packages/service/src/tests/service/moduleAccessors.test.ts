import { beforeEach, describe, expect, test } from "bun:test";
import { PoolManager } from "../../manager/pool";
import { ModuleService } from "../../service/module";
import { fakeModuleModel, initializeModuleService } from "./moduleContext";

describe("ModuleService model accessors", () => {
  beforeEach(() => {
    PoolManager.reset();
    initializeModuleService();
  });

  test("exposes camel-cased CRUD accessors", () => {
    const Base = ModuleService({
      models: {
        User: fakeModuleModel("user"),
        BlogPost: fakeModuleModel("blog_post"),
      },
    });
    const service = new (Base as never)() as InstanceType<typeof Base> & {
      user: { find: unknown };
      blogPost: { create: unknown };
    };
    expect(typeof service.user.find).toBe("function");
    expect(typeof service.blogPost.create).toBe("function");
  });

  test("keeps one base accessor per model and instance", () => {
    const Base = ModuleService({
      models: { User: fakeModuleModel("user") },
    });
    const service = new (Base as never)() as InstanceType<typeof Base> & {
      user: object;
    };
    expect(service.user).toBe(service.user);
  });

  test("exposes the model definition through ModelMethods", () => {
    const user = fakeModuleModel("user");
    const Base = ModuleService({ models: { User: user } });
    const service = new (Base as never)() as InstanceType<typeof Base> & {
      user: { getModelDefinition(): unknown };
    };
    expect(service.user.getModelDefinition()).toBe(user);
  });
});
