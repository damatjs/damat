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

  test("does not reactivate a captured executor when the ORM reuses its manager", async () => {
    const context = initializeTransactions({ reuseTransaction: true });
    const Base = ModuleService({ models: { User: fakeModel("user") } });
    const service = new (Base as never)() as InstanceType<typeof Base>;
    let first;
    await service.transaction(async (executor) => {
      first = executor;
    });
    await service.transaction(async (second) => {
      expect(second).not.toBe(first);
      expect(isTransactionalExecutor(context.transactions[0]! as never)).toBe(
        false,
      );
      expect(isTransactionalExecutor(first!)).toBe(false);
      await expect(
        withIdempotency(
          { scope: "reuse", key: "first", executor: first! },
          async () => ({ accepted: false }),
        ),
      ).rejects.toThrow(/active transaction/i);
      await expect(
        withIdempotency(
          { scope: "reuse", key: "second", executor: second },
          async () => ({ accepted: true }),
        ),
      ).resolves.toEqual({ value: { accepted: true }, replayed: false });
    });
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
