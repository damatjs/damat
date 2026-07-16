import { AsyncLocalStorage } from "node:async_hooks";
import {
  createTransactionalExecutor,
  invalidateTransactionalExecutor,
  type DurabilityExecutor,
} from "@damatjs/durability";
import type {
  PgEntityManager,
  TransactionalEntityManager,
} from "@damatjs/orm-pg";
import type { TransactionOptions } from "@damatjs/orm-type";
import type { ModelMethods } from "./methods";

interface ActiveTransaction {
  executor: DurabilityExecutor;
  methods: Map<string, ModelMethods>;
}

export class ServiceTransactions {
  private readonly storage = new AsyncLocalStorage<ActiveTransaction>();

  get active(): ActiveTransaction | undefined {
    return this.storage.getStore();
  }

  get inTransaction(): boolean {
    return this.active !== undefined;
  }

  resolve(name: string, fallback: Map<string, ModelMethods>): ModelMethods {
    const methods = this.active?.methods ?? fallback;
    const found = methods.get(name);
    if (!found) throw new Error(`Model methods are not registered: ${name}`);
    return found;
  }

  async run<R>(
    em: PgEntityManager,
    createMethods: (
      tx: TransactionalEntityManager,
    ) => Map<string, ModelMethods>,
    callback: (executor: DurabilityExecutor) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R> {
    const active = this.active;
    if (active) return callback(active.executor);
    return em.transaction(async (transaction) => {
      const executor = createTransactionalExecutor(
        transaction as DurabilityExecutor,
      );
      try {
        return await this.storage.run(
          { executor, methods: createMethods(transaction) },
          () => callback(executor),
        );
      } finally {
        invalidateTransactionalExecutor(executor);
      }
    }, options);
  }
}
