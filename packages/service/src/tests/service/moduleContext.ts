import { mock } from "bun:test";
import { PoolManager } from "../../manager/pool";

export function fakeModuleModel(name: string) {
  return {
    _name: name,
    _deletedAtField: "deleted_at",
    toTableSchema: () => ({ relations: [] }),
  } as never;
}

export function initializeModuleService() {
  const registered: Array<{ name: string; model: unknown }> = [];
  const em = {
    registered,
    txOptions: undefined as unknown,
    txEm: {
      query: mock(async () => ({ rows: [], rowCount: 0 })),
      getRepository: mock(() => ({ tx: true })),
    },
    registerModel: mock((name: string, model: unknown) => {
      registered.push({ name, model });
    }),
    getRepository: mock(() => ({ tx: false })),
    transaction: mock(
      async (callback: (tx: object) => Promise<unknown>, options?: unknown) => {
        em.txOptions = options;
        return callback(em.txEm);
      },
    ),
  };
  PoolManager.setup({
    pool: {} as never,
    logger: { info() {}, warn() {}, error() {}, debug() {} } as never,
    connectionManager: null as never,
  });
  PoolManager.setEntityManager(em as never);
  return em;
}
