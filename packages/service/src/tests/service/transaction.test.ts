import { beforeEach, describe, expect, test } from "bun:test";
import { PoolManager } from "../../manager/pool";
import { ModuleService } from "../../service/module";
import {
  createBarrier,
  fakeModel,
  initializeTransactions,
} from "./transactionContext";

describe("ModuleService transactions", () => {
  beforeEach(() => PoolManager.reset());

  test("passes a query executor and keeps zero-argument callbacks valid", async () => {
    initializeTransactions();
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const service = new (Base as never)() as InstanceType<typeof Base>;
    const row = await service.transaction(async (executor) => {
      const result = await executor.query<{ id: number }>("SELECT 1");
      return result.rows[0]!.id;
    });
    expect(row).toBe(1);
    await expect(service.transaction(async () => "legacy")).resolves.toBe(
      "legacy",
    );
  });

  test("reuses the executor and model methods in a nested transaction", async () => {
    const { em } = initializeTransactions();
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const service = new (Base as never)() as InstanceType<typeof Base> & {
      user: object;
    };
    await service.transaction(async (outer) => {
      const outerMethods = service.user;
      await service.transaction(async (inner) => {
        expect(inner).toBe(outer);
        expect(service.user).toBe(outerMethods);
      });
    });
    expect(em.transaction).toHaveBeenCalledTimes(1);
  });

  test("isolates concurrent executors and model methods on one instance", async () => {
    initializeTransactions();
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const service = new (Base as never)() as InstanceType<typeof Base> & {
      user: object;
    };
    const barrier = createBarrier(2);
    const run = () =>
      service.transaction(async (executor) => {
        const methods = service.user;
        await barrier();
        const rows = await (methods as any).findMany();
        return { executor, methods, rows, active: service.inTransaction };
      });
    const [first, second] = await Promise.all([run(), run()]);
    expect(first.executor).not.toBe(second.executor);
    expect(first.methods).toBe(second.methods);
    expect([first.rows[0].scope, second.rows[0].scope].sort()).toEqual([
      "tx-1",
      "tx-2",
    ]);
    expect(first.active).toBe(true);
    expect(second.active).toBe(true);
    expect(service.inTransaction).toBe(false);
  });

  test("does not share base model methods between service instances", () => {
    initializeTransactions();
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const first = new (Base as never)() as { user: object };
    const second = new (Base as never)() as { user: object };
    expect(first.user).not.toBe(second.user);
  });
});
