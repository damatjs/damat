import { mock } from "bun:test";
import { PoolManager } from "../../manager/pool";

export function fakeModel(name: string) {
  return {
    _name: name,
    _deletedAtField: "deleted_at",
    toTableSchema: () => ({ relations: [] }),
  } as never;
}

export function initializeTransactions(config?: {
  reuseTransaction?: boolean;
}) {
  let sequence = 0;
  const transactions: object[] = [];
  let txOptions: unknown;
  const reusedTransaction = createTransaction(0);
  function createTransaction(id: number) {
    return {
      id,
      query: mock(async () => ({ rows: [{ id }], rowCount: 1 })),
      getRepository: mock(() => ({
        findMany: mock(async () => [{ scope: `tx-${id}` }]),
      })),
    };
  }
  const em = {
    registerModel: mock(() => {}),
    getRepository: mock(() => ({
      findMany: mock(async () => [{ scope: "base" }]),
    })),
    transaction: mock(
      async (callback: (tx: object) => Promise<unknown>, options?: unknown) => {
        txOptions = options;
        const id = ++sequence;
        const tx = config?.reuseTransaction
          ? reusedTransaction
          : createTransaction(id);
        transactions.push(tx);
        return callback(tx);
      },
    ),
  };
  PoolManager.setup({
    pool: {} as never,
    logger: { info() {}, warn() {}, error() {}, debug() {} } as never,
    connectionManager: null as never,
  });
  PoolManager.setEntityManager(em as never);
  return { em, transactions, txOptions: () => txOptions };
}

export function createBarrier(size: number): () => Promise<void> {
  let arrived = 0;
  let release: (() => void) | undefined;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    arrived += 1;
    if (arrived === size) release?.();
    await ready;
  };
}
