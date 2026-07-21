import { expect, test } from "bun:test";
import { registerAfterCommit } from "@damatjs/durability";
import { ModuleService } from "../../service/module";
import { fakeModel, initializeTransactions } from "./transactionContext";

test("runs durability callbacks after the ORM transaction commits", async () => {
  initializeTransactions();
  const Base = ModuleService({ models: { User: fakeModel("user") } });
  const service = new (Base as never)() as InstanceType<typeof Base>;
  const order: string[] = [];
  await service.transaction(async (executor) => {
    order.push("callback");
    registerAfterCommit(executor, () => void order.push("after-commit"));
  });
  expect(order).toEqual(["callback", "after-commit"]);
});
