import { describe, expect, test } from "bun:test";
import type { DurabilityClient } from "@damatjs/durability";
import { runJobRetention } from "../../src/worker/retention";

const actor = { id: "retention-test", type: "system" as const };

function failingClient(options: { auditFails?: boolean; cause: unknown }) {
  const statuses: string[] = [];
  const client = {
    pool: {} as never,
    query: async (_sql: string, params: unknown[] = []) => {
      const status = String(params[3]);
      statuses.push(status);
      if (status === "failed" && options.auditFails) {
        throw new Error("audit unavailable");
      }
      return {
        rowCount: 1,
        rows: [
          {
            id: String(statuses.length),
            operation: "job_retention",
            work_kind: "job",
            scope: null,
            status,
            actor,
            details: {},
            created_at: new Date(),
            completed_at: null,
          },
        ],
      };
    },
    transaction: async () => {
      throw options.cause;
    },
  } as unknown as DurabilityClient;
  return { client, statuses };
}

describe("retention failure audit", () => {
  test("records failed without masking the cleanup error", async () => {
    const root = new Error("cleanup failed");
    const { client, statuses } = failingClient({ cause: root });
    await expect(runJobRetention({ actor, client })).rejects.toBe(root);
    expect(statuses).toEqual(["requested", "failed"]);
  });

  test("preserves a non-Error cause when failure audit also fails", async () => {
    const { client, statuses } = failingClient({
      cause: "cleanup stopped",
      auditFails: true,
    });
    await expect(runJobRetention({ actor, client })).rejects.toBe(
      "cleanup stopped",
    );
    expect(statuses).toEqual(["requested", "failed"]);
  });

  test("rejects unknown actor types before persistence", async () => {
    await expect(
      runJobRetention({ actor: { id: "x", type: "robot" } as never }),
    ).rejects.toThrow("actor type is invalid");
  });
});
