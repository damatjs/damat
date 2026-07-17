import { expect, test } from "bun:test";
import { createDurableEventInspectionClient } from "../../src";

test("retention reuses one default cutoff for audit and deletion", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const executor = {
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (sql.includes("_damat_maintenance_activity")) {
        return {
          rows: [
            {
              id: calls.length,
              operation: "event_retention",
              work_kind: "event",
              scope: null,
              status: params[3],
              actor: JSON.parse(String(params[4])),
              details: JSON.parse(String(params[5])),
              created_at: new Date(),
              completed_at: params[6] ?? null,
            },
          ],
          rowCount: 1,
        };
      }
      if (sql.includes('SELECT o."id" FROM "_damat_event_outbox"')) {
        return { rows: [{ id: crypto.randomUUID() }], rowCount: 1 };
      }
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

  await client.runRetention({}, { id: "operator", type: "user" });

  const audits = calls.filter(({ sql }) =>
    sql.includes("_damat_maintenance_activity"),
  );
  const selection = calls.find(
    ({ sql }) => sql.includes('SELECT o."id"') && !sql.includes("FOR UPDATE"),
  )!;
  const locked = calls.find(
    ({ sql }) => sql.includes('SELECT o."id"') && sql.includes("FOR UPDATE"),
  )!;
  const requested = JSON.parse(String(audits[0]!.params[5]));
  const completed = JSON.parse(String(audits[1]!.params[5]));
  expect(requested.terminalBefore).toBe(
    (selection.params[0] as Date).toISOString(),
  );
  expect(locked.params[1]).toBe(selection.params[0]);
  expect(completed.requestId).toBe(requested.requestId);
});
