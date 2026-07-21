import { beforeEach, expect, test } from "bun:test";
import {
  listWorkers,
  setDurabilityClient,
  type DurabilityClient,
} from "@damatjs/durability";
import { clearDurableEventDefinitions, DurableEventWorker } from "../../src";
import { durability, resetWorkerStorage } from "./context";
import { waitUntil } from "./wait";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("mark-stopping failure still quiesces maintenance", async () => {
  const worker = new DurableEventWorker({
    consumers: [{ event: "mark.failure", consumer: "consumer" }],
    registryHeartbeatIntervalMs: 5,
    reconcileIntervalMs: 1_000,
  });
  worker.start();
  await waitUntil(async () => Boolean(await record(worker.id)));
  const root = new Error("mark stopping failed");
  setDurabilityClient(failMarkStopping(root));
  try {
    await expect(worker.stop()).rejects.toBe(root);
  } finally {
    setDurabilityClient(durability);
  }
  const heartbeat = (await record(worker.id))!.lastHeartbeatAt;
  await Bun.sleep(30);
  expect((await record(worker.id))!.lastHeartbeatAt.getTime()).toBe(
    heartbeat.getTime(),
  );
});

function failMarkStopping(root: Error): DurabilityClient {
  return {
    ...durability,
    query: (sql, params) => {
      if (
        sql.includes('"stopping_at" = COALESCE') &&
        !sql.includes('"stopped_at"')
      ) {
        return Promise.reject(root);
      }
      return durability.query(sql, params);
    },
  };
}

async function record(id: string) {
  return (await listWorkers({ ids: [id] }))[0];
}
