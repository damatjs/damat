import { beforeEach, describe, expect, test } from "bun:test";
import { isTransactionalExecutor, withIdempotency } from "@damatjs/durability";
import { PoolManager } from "../../manager/pool";
import { ModuleService } from "../../service/module";
import { fakeModel, initializeTransactions } from "./transactionContext";

describe("ModuleService transaction executor", () => {
  beforeEach(() => PoolManager.reset());

  test("marks the callback executor for transactional durability", async () => {
    initializeTransactions();
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const service = new (Base as never)() as InstanceType<typeof Base>;
    let captured;
    await service.transaction(async (executor) => {
      captured = executor;
      expect(isTransactionalExecutor(executor)).toBe(true);
      const result = await withIdempotency(
        { scope: "service", key: "marked", executor },
        async () => ({ accepted: true }),
      );
      expect(result.replayed).toBe(false);
    });
    expect(isTransactionalExecutor(captured!)).toBe(false);
  });

  test("unmarks the executor when the transaction callback fails", async () => {
    initializeTransactions();
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const service = new (Base as never)() as InstanceType<typeof Base>;
    let captured;
    await expect(
      service.transaction(async (executor) => {
        captured = executor;
        expect(isTransactionalExecutor(executor)).toBe(true);
        throw new Error("operation failed");
      }),
    ).rejects.toThrow("operation failed");
    expect(isTransactionalExecutor(captured!)).toBe(false);
  });

  test("forwards transaction options to the entity manager", async () => {
    const context = initializeTransactions();
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const service = new (Base as never)() as InstanceType<typeof Base>;
    await service.transaction(async () => undefined, {
      isolationLevel: "SERIALIZABLE",
    });
    expect(context.txOptions()).toEqual({
      isolationLevel: "SERIALIZABLE",
    });
  });
});
