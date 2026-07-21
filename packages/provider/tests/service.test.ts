import { expect, mock, test } from "bun:test";
import { z } from "@damatjs/deps/zod";

const emitted: Array<{ event: string; payload: unknown }> = [];

mock.module("@damatjs/events", () => ({
  getEventBus: () => ({
    emit: async (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
  }),
}));

// Load the event-dependent service graph only after its boundary is mocked.
const { PoolManager } = await import("@damatjs/services");
const { ProviderService } = await import("../src");

test("ProviderService preserves the complete ModuleService surface", async () => {
  emitted.length = 0;
  PoolManager.setup({
    pool: {} as never,
    logger: {} as never,
    connectionManager: {} as never,
  });
  const repository = {
    findMany: mock(async () => [{ id: "account" }]),
    create: mock(async ({ data }) => data),
  };
  const entityManager = {
    registerModel: mock(() => {}),
    getRepository: mock(() => repository),
    transaction: mock(async (callback) =>
      callback({ getRepository: () => repository }),
    ),
  };
  PoolManager.setEntityManager(entityManager as never);
  const accountModel = {
    _name: "account",
    toTableSchema: () => ({ columns: [], relations: [] }),
  } as never;
  const Base = ProviderService({
    role: "email",
    models: { Account: accountModel },
    credentialsSchema: z.object({ token: z.string() }),
    cache: { prefix: "email" },
    events: true,
  });
  class EmailService extends Base {}
  const service = new EmailService({ token: "secret" });
  expect(service.providerRole).toBe("email");
  expect(EmailService.providerRole).toBe("email");
  expect(service.credentials).toEqual({ token: "secret" });
  expect(service.getModels).toEqual([accountModel]);
  expect(await service.account.findMany({ cache: true })).toEqual([
    { id: "account" },
  ]);
  await service.account.create({ data: {} });
  expect(emitted[0]).toMatchObject({
    event: "Account.created",
    payload: { model: "Account", method: "create" },
  });
  const result = await service.transaction(async () => {
    expect(service.inTransaction).toBe(true);
    return "committed";
  });
  expect(result).toBe("committed");
  expect(entityManager.transaction).toHaveBeenCalledTimes(1);
  expect(() => new EmailService({ token: 1 } as never)).toThrow();
  PoolManager.reset();
});
