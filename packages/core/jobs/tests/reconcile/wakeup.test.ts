import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { enqueueJob } from "../../src/client";
import { clearJobDefinitions, defineJob } from "../../src/definitions/registry";
import {
  clearJobWakeupPublisher,
  configureJobWakeupPublisher,
  JOB_WAKEUP_CHANNEL,
  startJobWakeupSubscriber,
} from "../../src/wakeup";
import {
  durability,
  ensureStorage,
  pool,
  uniqueName,
} from "../storage/context";
import { FakeWakeupRedis } from "./wakeup-fixture";

beforeAll(ensureStorage);
beforeEach(() => {
  clearJobDefinitions();
  clearJobWakeupPublisher();
});

describe("optional job wake-ups", () => {
  test("publish failure never rolls back a committed enqueue", async () => {
    const name = uniqueName("wakeup-failure");
    defineJob(name, async () => {});
    configureJobWakeupPublisher({
      publish: async () => {
        throw new Error("redis unavailable");
      },
    });
    const run = await enqueueJob(name, {}, { queue: "wake-failure" });
    const stored = await pool.query(
      `SELECT 1 FROM "_damat_job_runs" WHERE "id"=$1`,
      [run.id],
    );
    expect(stored.rowCount).toBe(1);
  });

  test("owned transactions publish only after PostgreSQL commit", async () => {
    const name = uniqueName("wakeup-commit");
    defineJob(name, async () => {});
    let visible = 0;
    configureJobWakeupPublisher({
      publish: async () => {
        visible =
          (
            await pool.query(
              `SELECT 1 FROM "_damat_job_runs" WHERE "name"=$1`,
              [name],
            )
          ).rowCount ?? 0;
        return 1;
      },
    });
    await enqueueJob(name, {}, { queue: "wake-commit" });
    expect(visible).toBe(1);
  });

  test("caller-owned transactions suppress premature publication", async () => {
    const name = uniqueName("wakeup-external");
    defineJob(name, async () => {});
    let published = 0;
    configureJobWakeupPublisher({ publish: async () => ++published });
    await durability.transaction((executor) =>
      enqueueJob(name, {}, { queue: "wake-external", executor }),
    );
    expect(published).toBe(0);
  });

  test("subscriber duplicates Redis and ignores malformed messages", async () => {
    const redis = new FakeWakeupRedis();
    const queues: string[] = [];
    const stop = await startJobWakeupSubscriber(redis, (queue) =>
      queues.push(queue),
    );
    const connection = redis.duplicateConnection;
    connection.emit(JOB_WAKEUP_CHANNEL, "not-json");
    connection.emit(
      JOB_WAKEUP_CHANNEL,
      JSON.stringify({ kind: "events", queue: "q" }),
    );
    connection.emit(
      JOB_WAKEUP_CHANNEL,
      JSON.stringify({ kind: "jobs", queue: "mail" }),
    );
    expect(redis.duplicateCalls).toBe(1);
    expect(queues).toEqual(["mail"]);
    expect(() => connection.emitError(new Error("redis down"))).not.toThrow();
    await stop();
    expect(connection.stopped).toBe(true);
  });
});
