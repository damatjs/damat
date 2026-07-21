import { describe, expect, mock, test } from "bun:test";
import { createUserWithDurableWork } from "@/examples/transactionalWork";

describe("transactional durable work", () => {
  test("shares the domain transaction executor", async () => {
    const executor = { query: mock(async () => ({ rows: [] })) };
    const user = { id: "usr_1", email: "user@example.com", name: "User" };
    const create = mock(async () => user);
    const service = {
      users: { create },
      transaction: async (run: (value: unknown) => Promise<unknown>) =>
        run(executor),
    };
    const enqueue = mock(async () => ({ id: "run_1" }));
    const publish = mock(async () => ({ id: "event_1" }));

    const result = await createUserWithDurableWork(
      { email: user.email, name: user.name, reportId: "rep_1" },
      { service, enqueue, publish },
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]![2]).toMatchObject({
      executor,
      correlationId: user.id,
    });
    expect(publish.mock.calls[0]![2]).toMatchObject({
      executor,
      correlationId: user.id,
    });
    expect(result).toMatchObject({
      user,
      job: { id: "run_1" },
      event: { id: "event_1" },
    });
  });

  test("propagates a durable write failure through the transaction", async () => {
    const failure = new Error("enqueue failed");
    const service = {
      users: { create: async () => ({ id: "usr_1", email: "u@x.co" }) },
      transaction: (run: (value: object) => Promise<unknown>) => run({}),
    };
    await expect(
      createUserWithDurableWork(
        { email: "u@x.co", reportId: "rep_1" },
        {
          service,
          enqueue: async () => {
            throw failure;
          },
          publish: async () => ({ id: "event_1" }),
        },
      ),
    ).rejects.toBe(failure);
  });
});
