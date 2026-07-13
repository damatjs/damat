import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  setSystemTime,
} from "bun:test";
import {
  enqueueJob,
  getJobQueue,
  clearJobQueues,
  defineJob,
  clearJobDefinitions,
  DEFAULT_JOB_QUEUE,
} from "../src/index";
// The FakeRedis the @damatjs/redis suite itself tests RedisQueue against — the
// real queue implementation runs on it, so nothing here mocks queue semantics.
import {
  createFakeRedis,
  type FakeRedis,
} from "../../redis/tests/helpers/fakeRedis";

let client: FakeRedis;

beforeEach(() => {
  clearJobDefinitions();
  clearJobQueues();
  client = createFakeRedis();
});

afterEach(() => {
  setSystemTime(); // restore the real clock
});

describe("enqueueJob — envelope", () => {
  it("builds a pending envelope carrying the job name and payload", async () => {
    const job = await enqueueJob("send-email", { to: "a@b.c" }, { client });

    expect(job.data).toEqual({ job: "send-email", payload: { to: "a@b.c" } });
    expect(job.status).toBe("pending");
    expect(job.attempts).toBe(0);
    expect(job.queue).toBe(DEFAULT_JOB_QUEUE);
    expect(job.createdAt).toBeInstanceOf(Date);
    expect(job.delay).toBeUndefined();
    expect(typeof job.id).toBe("string");
    expect(job.id.length).toBeGreaterThan(0);
  });

  it("assigns a unique id per enqueue", async () => {
    const first = await enqueueJob("send-email", { n: 1 }, { client });
    const second = await enqueueJob("send-email", { n: 2 }, { client });
    expect(second.id).not.toBe(first.id);
  });

  it("persists the job in the queue (retrievable and dequeuable)", async () => {
    const job = await enqueueJob("send-email", { to: "x" }, { client });

    const queue = getJobQueue({ client });
    const stored = await queue.getJob(job.id);
    expect(stored?.data).toEqual({ job: "send-email", payload: { to: "x" } });

    const [dequeued] = await queue.dequeue(1);
    expect(dequeued?.id).toBe(job.id);
  });

  it("uses the explicit queueName", async () => {
    const job = await enqueueJob("send-email", null, {
      client,
      queueName: "mailers",
    });

    expect(job.queue).toBe("mailers");
    const [dequeued] = await getJobQueue({
      client,
      queueName: "mailers",
    }).dequeue(1);
    expect(dequeued?.id).toBe(job.id);
  });
});

describe("enqueueJob — priority/maxAttempts resolution", () => {
  it("falls back to the built-in defaults when the job has no definition", async () => {
    const job = await enqueueJob("undefined-job", null, { client });
    expect(job.priority).toBe("normal");
    expect(job.maxAttempts).toBe(3);
  });

  it("uses the definition's options when no enqueue option is given", async () => {
    defineJob("important", async () => {}, {
      priority: "high",
      maxAttempts: 5,
    });

    const job = await enqueueJob("important", null, { client });
    expect(job.priority).toBe("high");
    expect(job.maxAttempts).toBe(5);
  });

  it("lets enqueue options override the definition", async () => {
    defineJob("important", async () => {}, {
      priority: "high",
      maxAttempts: 5,
    });

    const job = await enqueueJob("important", null, {
      client,
      priority: "critical",
      maxAttempts: 7,
    });
    expect(job.priority).toBe("critical");
    expect(job.maxAttempts).toBe(7);
  });
});

describe("enqueueJob — delayMs", () => {
  it("defers delivery until the delay has elapsed", async () => {
    // Scores are Date.now()-based (delay minus a priority offset of up to 4s),
    // so a delay large enough to land in the future is jumped over with
    // setSystemTime — FakeRedis.advanceTime only drives TTL expiry, not scores.
    const job = await enqueueJob(
      "later",
      { n: 1 },
      { client, delayMs: 60_000 },
    );
    expect(job.delay).toBe(60_000);

    const queue = getJobQueue({ client });
    expect(await queue.dequeue(5)).toEqual([]); // not yet due
    const stats = await queue.getStats();
    expect(stats.pending).toBe(1);

    setSystemTime(new Date(Date.now() + 61_000));
    const [dequeued] = await queue.dequeue(5);
    expect(dequeued?.id).toBe(job.id);
  });
});

describe("getJobQueue", () => {
  it("caches one queue instance per queue name", () => {
    const a = getJobQueue({ client });
    const b = getJobQueue({ client });
    const named = getJobQueue({ client, queueName: "other" });

    expect(b).toBe(a);
    expect(named).not.toBe(a);
    expect(getJobQueue({ client, queueName: "other" })).toBe(named);
  });

  it("clearJobQueues drops the cache so a fresh instance is created", () => {
    const before = getJobQueue({ client });
    clearJobQueues();
    expect(getJobQueue({ client })).not.toBe(before);
  });
});
