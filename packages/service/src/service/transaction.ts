import { AsyncLocalStorage } from "node:async_hooks";
import {
  createTransactionalExecutor,
  invalidateTransactionalExecutor,
  runAfterCommitCallbacks,
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
  private readonly storage: AsyncLocalStorage<ActiveTransaction>;

  constructor() {
    this.storage = new AsyncLocalStorage<ActiveTransaction>();
  }

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
    let executor: DurabilityExecutor | undefined;
    const result = await em.transaction(async (transaction) => {
      const transactionExecutor = createTransactionalExecutor(
        transaction as DurabilityExecutor,
      );
      executor = transactionExecutor;
      try {
        return await this.storage.run(
          {
            executor: transactionExecutor,
            methods: createMethods(transaction),
          },
          () => callback(transactionExecutor),
        );
      } finally {
        invalidateTransactionalExecutor(transactionExecutor);
      }
    }, options);
    await runAfterCommitCallbacks(executor!);
    return result;
  }
}
