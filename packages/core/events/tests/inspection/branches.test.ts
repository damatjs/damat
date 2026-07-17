import { expect, test } from "bun:test";
import { createDurableEventInspectionClient } from "../../src";
import { inspectionClient } from "./fixture";

test("validates inspection options and page limits", async () => {
  expect(() => createDurableEventInspectionClient(undefined as never)).toThrow(
    "cursorSigningKey is required",
  );
  expect(() =>
    createDurableEventInspectionClient({ cursorSigningKey: "" }),
  ).toThrow("Cursor signing key cannot be empty");
  expect(() =>
    createDurableEventInspectionClient({ cursorSigningKey: new Uint8Array() }),
  ).toThrow("Cursor signing key cannot be empty");
  for (const staleAfterMs of [0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() =>
      createDurableEventInspectionClient({
        cursorSigningKey: "inspection-secret",
        staleAfterMs,
      }),
    ).toThrow("staleAfterMs must be a positive safe integer");
  }
  await expect(inspectionClient().listEvents({ limit: 0 })).rejects.toThrow(
    "event inspection limit must be between 1 and 200",
  );
});

test("reports a missing delivery before retrying", async () => {
  const responses: unknown[][] = [[]];
  const executor = {
    query: async () => ({ rows: responses.shift() ?? [], rowCount: 1 }),
  };
  const client = createDurableEventInspectionClient({
    cursorSigningKey: "inspection-secret",
    client: {
      ...executor,
      pool: {
        ...executor,
        connect: async () => ({ ...executor, release() {} }),
      },
      transaction: async (callback) => callback(executor),
    } as never,
  });

  await expect(
    client.retryDelivery(crypto.randomUUID(), { id: "operator", type: "user" }),
  ).rejects.toHaveProperty("name", "DurableEventNotFoundError");
});

test("uses one default time for view filtering and returned flags", async () => {
  let parameters: unknown[] = [];
  const executor = {
    query: async (_sql: string, values: unknown[] = []) => {
      parameters = values;
      return { rows: [], rowCount: 0 };
    },
  };
  const client = createDurableEventInspectionClient({
    cursorSigningKey: "inspection-secret",
    client: {
      ...executor,
      pool: {
        ...executor,
        connect: async () => ({ ...executor, release() {} }),
      },
      transaction: async (callback) => callback(executor),
    } as never,
  });

  await client.listEvents({ views: ["upcoming"] });

  expect(parameters[0]).toBeInstanceOf(Date);
  expect(parameters[1]).toBe(parameters[0]);
});
