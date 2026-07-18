import { expect, mock, test } from "bun:test";
import { createDefaultDependencies } from "@/examples/transactionalWork";

test("default dependencies require the user module", () => {
  expect(() => createDefaultDependencies(() => null)).toThrow(
    'Module "user" is not initialized',
  );
});

test("default dependencies forward durable calls with the executor", async () => {
  const service = {
    users: { create: async () => ({ id: "usr_1", email: "u@example.com" }) },
    transaction: async (run: (value: object) => unknown) => run({}),
  };
  const enqueue = mock(async () => ({ id: "run_1" }));
  const publish = mock(async () => ({ id: "event_1" }));
  const dependencies = createDefaultDependencies(
    () => service,
    enqueue as never,
    publish as never,
  );
  const executor = { query: async () => ({ rows: [] }) };
  const options = { executor, correlationId: "corr_1" };

  await dependencies.enqueue("report.generate", {}, options);
  await dependencies.publish("user.created", {}, options);
  expect(enqueue.mock.calls[0]![2]).toMatchObject(options);
  expect(publish.mock.calls[0]![2]).toMatchObject(options);
});
