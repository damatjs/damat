import { beforeEach, describe, expect, test } from "bun:test";
import { PoolManager } from "../../manager/pool";
import { ModuleService } from "../../service/module";
import { fakeModel, initializeTransactions } from "./transactionContext";

interface UserAccessor {
  findMany(): Promise<Array<{ scope: string }>>;
}

describe("ModuleService accessor lifetime", () => {
  beforeEach(() => PoolManager.reset());

  test("a captured base accessor resolves the active transaction at call time", async () => {
    initializeTransactions();
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const service = new (Base as never)() as InstanceType<typeof Base> & {
      user: UserAccessor;
    };
    const captured = service.user;
    const findMany = captured.findMany;
    expect(await findMany()).toEqual([{ scope: "base" }]);
    await service.transaction(async () => {
      expect(await findMany()).toEqual([{ scope: "tx-1" }]);
    });
  });

  test("an accessor retained after commit falls back to base methods", async () => {
    initializeTransactions();
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const service = new (Base as never)() as InstanceType<typeof Base> & {
      user: UserAccessor;
    };
    let retained: UserAccessor | undefined;
    await service.transaction(async () => {
      retained = service.user;
      expect(await retained.findMany()).toEqual([{ scope: "tx-1" }]);
    });
    expect(await retained!.findMany()).toEqual([{ scope: "base" }]);
  });
});
