import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  createDurabilityClient,
  getDurabilityClient,
  setDurabilityClient,
  type DurabilityClient,
} from "@damatjs/durability";
import { ActiveExecutions } from "../../src/worker/active";
import { JobLeaseHeartbeatLoop } from "../../src/worker/heartbeat-loop";
import { resolveWorkerOptions } from "../../src/worker/options";

let previous: DurabilityClient | undefined;
beforeEach(() => {
  try {
    previous = getDurabilityClient();
  } catch {
    previous = undefined;
  }
});
afterEach(() => {
  if (previous) setDurabilityClient(previous);
  else clearDurabilityClient();
});

test("active job leases share one heartbeat transaction", async () => {
  const queries: string[] = [];
  let connections = 0;
  const query = async (sql: string) => {
    queries.push(sql);
    return { rows: [], rowCount: 1 };
  };
  setDurabilityClient(
    createDurabilityClient({
      pool: {
        query,
        connect: async () => {
          connections += 1;
          return { query, release: () => {} };
        },
      },
    }),
  );
  let release!: () => void;
  const executionDone = new Promise<void>(
    (resolve) => void (release = resolve),
  );
  let observed!: () => void;
  const heartbeat = new Promise<void>((resolve) => void (observed = resolve));
  const active = new ActiveExecutions(() => {});
  let aborted = 0;
  active.track({
    promise: executionDone,
    abort: () => {},
    heartbeat: async (executor) => {
      await executor!.query("HEARTBEAT");
      observed();
    },
  });
  active.track({
    promise: executionDone,
    abort: () => aborted++,
    heartbeat: async () => {
      throw new Error("lost lease");
    },
  });
  const loop = new JobLeaseHeartbeatLoop(
    resolveWorkerOptions({
      batchHeartbeats: true,
      heartbeatIntervalMs: 2,
      leaseMs: 20,
    }),
    active,
  );
  loop.start();
  await heartbeat;
  await loop.stop();
  release();
  await executionDone;
  expect(connections).toBe(1);
  expect(aborted).toBe(1);
  expect(queries).toEqual(["BEGIN", "HEARTBEAT", "COMMIT"]);
});
