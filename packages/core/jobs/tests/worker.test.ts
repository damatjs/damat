import { describe, it, expect, beforeEach, afterEach, setSystemTime } from "bun:test";
import { setGlobalLogger, closeLogger } from "@damatjs/logger";
import {
  JobWorker,
  defineJob,
  clearJobDefinitions,
  enqueueJob,
  getJobQueue,
  clearJobQueues,
} from "../src/index";
// The same FakeRedis the @damatjs/redis suite runs RedisQueue against: the
// worker exercises the REAL queue (scores, retry re-queues, dead-lettering).
import { createFakeRedis, FakeRedis } from "../../redis/tests/helpers/fakeRedis";

// ---------------------------------------------------------------------------
// Recording logger: the worker reports lifecycle + failures through the global
// logger, so record every level and restore the logger after each test.
// ---------------------------------------------------------------------------
const logCalls: Array<{ level: string; message: string }> = [];
const record = (level: string) => (message: string) => {
  logCalls.push({ level, message });
};
const recordingLogger = {
  debug: record("debug"),
  info: record("info"),
  warn: record("warn"),
  error: record("error"),
  fatal: () => {},
  waiting: () => {},
  progress: () => {},
  cached: () => {},
  success: () => {},
  skip: () => {},
  child: () => recordingLogger,
  withPrefix: () => recordingLogger,
  request: () => {},
  close: () => {},
};

const logged = (level: string, prefix: string) =>
  logCalls.filter((c) => c.level === level && c.message.startsWith(prefix));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll (real timers, bounded) until the condition holds. */
async function waitFor(condition: () => boolean | Promise<boolean>, label = "condition") {
  for (let i = 0; i < 400; i++) {
    if (await condition()) return;
    await sleep(5);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

let client: FakeRedis;
const startedWorkers: JobWorker[] = [];

/** Track workers so a failing assertion can't leak a running poll loop. */
function makeWorker(options: ConstructorParameters<typeof JobWorker>[0]) {
  const worker = new JobWorker(options);
  startedWorkers.push(worker);
  return worker;
}

beforeEach(() => {
  logCalls.length = 0;
  clearJobDefinitions();
  clearJobQueues();
  client = createFakeRedis() as FakeRedis;
  setGlobalLogger(recordingLogger as never);
});

afterEach(async () => {
  setSystemTime(); // restore the real clock before the loops wind down
  await Promise.all(startedWorkers.map((w) => w.stop()));
  startedWorkers.length = 0;
  clearJobDefinitions();
  clearJobQueues();
  closeLogger();
});

describe("JobWorker.process — success", () => {
  it("runs the handler and marks the job completed with attempts 1", async () => {
    const handled: Array<{ payload: unknown; jobId: string }> = [];
    defineJob("greet", (payload, job) => {
      handled.push({ payload, jobId: job.id });
    });

    const enqueued = await enqueueJob("greet", { name: "Ada" }, { client });
    const queue = getJobQueue({ client });
    const [claimed] = await queue.dequeue(1);

    const worker = makeWorker({ client });
    await worker.process(claimed!);

    expect(handled).toEqual([{ payload: { name: "Ada" }, jobId: enqueued.id }]);

    const stored = await queue.getJob(enqueued.id);
    expect(stored?.status).toBe("completed");
    expect(stored?.attempts).toBe(1);
    expect(stored?.completedAt).toBeDefined();
    expect(await queue.getStats()).toEqual({
      pending: 0,
      processing: 0,
      completed: 1,
      failed: 0,
    });
    expect(logged("debug", "Job completed")).toHaveLength(1);
  });
});

describe("JobWorker.process — retry and dead-letter", () => {
  it("retries with exponential backoff, then dead-letters on the final attempt", async () => {
    defineJob(
      "flaky",
      () => {
        throw new Error("boom");
      },
      { backoffMs: 60_000 }, // multiplier defaults to 2, maxAttempts to 3
    );

    const enqueued = await enqueueJob("flaky", null, { client });
    const queue = getJobQueue({ client });
    const worker = makeWorker({ client, visibilityTimeoutMs: 30_000 });

    // Attempt 1 fails → retrying with delay = backoffMs, error kept.
    const [first] = await queue.dequeue(1);
    await worker.process(first!);

    let stored = await queue.getJob(enqueued.id);
    expect(stored?.status).toBe("retrying");
    expect(stored?.attempts).toBe(1);
    expect(stored?.error).toBe("boom");
    expect(stored?.delay).toBe(60_000);
    expect(
      logged("warn", 'Job "flaky" failed (attempt 1/3) — retrying in 60000ms'),
    ).toHaveLength(1);

    // The backoff defers redelivery: nothing is due yet. (Scores are
    // Date.now()-based, so due-ness is advanced with setSystemTime —
    // FakeRedis.advanceTime only drives TTL expiry, not queue scores.)
    expect(await queue.dequeue(5)).toEqual([]);

    setSystemTime(new Date(Date.now() + 61_000));
    const [second] = await queue.dequeue(5);
    expect(second?.id).toBe(enqueued.id);
    expect(second?.attempts).toBe(1);

    // Attempt 2 fails → delay = backoffMs * multiplier.
    await worker.process(second!);
    stored = await queue.getJob(enqueued.id);
    expect(stored?.status).toBe("retrying");
    expect(stored?.attempts).toBe(2);
    expect(stored?.delay).toBe(120_000);
    expect(
      logged("warn", 'Job "flaky" failed (attempt 2/3) — retrying in 120000ms'),
    ).toHaveLength(1);
    expect(await queue.dequeue(5)).toEqual([]);

    setSystemTime(new Date(Date.now() + 121_000));
    const [third] = await queue.dequeue(5);
    expect(third?.attempts).toBe(2);

    // Attempt 3 exhausts maxAttempts → dead-lettered with the error kept.
    await worker.process(third!);
    stored = await queue.getJob(enqueued.id);
    expect(stored?.status).toBe("failed");
    expect(stored?.attempts).toBe(3);
    expect(stored?.error).toBe("boom");
    expect(stored?.completedAt).toBeDefined();
    expect(
      logged("error", 'Job "flaky" dead-lettered after 3 attempt(s): boom'),
    ).toHaveLength(1);

    // Terminal: never redelivered.
    expect((await queue.getStats()).failed).toBe(1);
    expect(await queue.dequeue(5)).toEqual([]);
  });

  it("stringifies non-Error throws into the stored error", async () => {
    defineJob(
      "throws-string",
      () => {
        // eslint-disable-next-line no-throw-literal
        throw "plain failure";
      },
      { backoffMs: 60_000 },
    );

    const enqueued = await enqueueJob("throws-string", null, { client, maxAttempts: 1 });
    const queue = getJobQueue({ client });
    const [claimed] = await queue.dequeue(1);

    await makeWorker({ client }).process(claimed!);

    const stored = await queue.getJob(enqueued.id);
    expect(stored?.status).toBe("failed");
    expect(stored?.error).toBe("plain failure");
  });
});

describe("JobWorker.process — unknown job", () => {
  it("dead-letters immediately with the 'Unknown job' error", async () => {
    const enqueued = await enqueueJob("ghost", { x: 1 }, { client });
    const queue = getJobQueue({ client });
    const [claimed] = await queue.dequeue(1);

    await makeWorker({ client }).process(claimed!);

    const stored = await queue.getJob(enqueued.id);
    expect(stored?.status).toBe("failed");
    expect(stored?.attempts).toBe(0); // never executed
    expect(stored?.error).toBe('Unknown job "ghost" — no defineJob() in this process');
    expect(
      logged("error", 'Unknown job "ghost" — dead-lettered (define it before enqueueing)'),
    ).toHaveLength(1);
    expect((await queue.getStats()).failed).toBe(1);
  });
});

describe("JobWorker — start/stop loop", () => {
  it("start() polls and processes an enqueued job end-to-end; start is idempotent", async () => {
    let handledPayload: unknown;
    defineJob("task", (payload) => {
      handledPayload = payload;
    });
    const enqueued = await enqueueJob("task", { ok: true }, { client });
    const queue = getJobQueue({ client });

    const worker = makeWorker({ client, pollIntervalMs: 10 });
    expect(worker.isRunning).toBe(false);

    worker.start();
    worker.start(); // second start is a no-op
    expect(worker.isRunning).toBe(true);
    expect(logged("info", "Job worker started")).toHaveLength(1);

    await waitFor(
      async () => (await queue.getJob(enqueued.id))?.status === "completed",
      "job completion",
    );
    expect(handledPayload).toEqual({ ok: true });

    await worker.stop();
    expect(worker.isRunning).toBe(false);
    expect(logged("info", "Job worker stopped")).toHaveLength(1);

    // stop() is idempotent — no second "stopped" line.
    await worker.stop();
    expect(logged("info", "Job worker stopped")).toHaveLength(1);
  });

  it("stop() waits for the in-flight job to settle", async () => {
    const events: string[] = [];
    defineJob("slow", async () => {
      events.push("started");
      await sleep(40);
      events.push("finished");
    });
    const enqueued = await enqueueJob("slow", null, { client });
    const queue = getJobQueue({ client });

    const worker = makeWorker({ client, pollIntervalMs: 5 });
    worker.start();

    await waitFor(() => events.includes("started"), "handler start");
    await worker.stop();

    // The handler finished (and was acked) before stop resolved.
    expect(events).toEqual(["started", "finished"]);
    expect((await queue.getJob(enqueued.id))?.status).toBe("completed");
  });

  it("stop() on a never-started worker is a quiet no-op", async () => {
    const worker = new JobWorker(); // defaults only — nothing to poll yet
    expect(worker.isRunning).toBe(false);
    await worker.stop();
    expect(logged("info", "Job worker stopped")).toHaveLength(0);
  });

  it("logs a dequeue failure and keeps polling (next tick succeeds)", async () => {
    // `eval` here is FakeRedis's fake of the Redis EVAL command (ioredis
    // `redis.eval`), NOT JavaScript's eval — no code is executed; it backs
    // the atomic dequeue script, so fail it exactly once.
    class FlakyRedis extends FakeRedis {
      evalFailures = 1;
      override async eval(
        script: string,
        numKeys: number,
        ...keysAndArgs: Array<string | number>
      ): Promise<unknown> {
        if (this.evalFailures > 0) {
          this.evalFailures--;
          throw new Error("eval down");
        }
        return super.eval(script, numKeys, ...keysAndArgs);
      }
    }
    const flaky = new FlakyRedis() as never;

    defineJob("task", () => {});
    const enqueued = await enqueueJob("task", null, { client: flaky, queueName: "flaky-q" });
    const queue = getJobQueue({ client: flaky, queueName: "flaky-q" });

    const worker = makeWorker({ client: flaky, queueName: "flaky-q", pollIntervalMs: 5 });
    worker.start();

    await waitFor(
      () => logged("error", "Job dequeue failed — retrying next poll").length > 0,
      "dequeue failure log",
    );
    // The loop survived the failure and completed the job on a later poll.
    await waitFor(
      async () => (await queue.getJob(enqueued.id))?.status === "completed",
      "job completion after failure",
    );
    expect(worker.isRunning).toBe(true);

    await worker.stop();
  });
});
