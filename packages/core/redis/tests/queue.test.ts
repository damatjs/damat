import { describe, it, expect, beforeEach } from "bun:test";
import { RedisQueue, type QueueJob } from "../src/index";
import { createFakeRedis, type FakeRedis } from "./helpers/fakeRedis";

type JobData = { task: string };

function makeJob(
  overrides: Partial<QueueJob<JobData>> = {},
): QueueJob<JobData> {
  return {
    id: overrides.id ?? "job-1",
    queue: "test",
    data: overrides.data ?? { task: "do-thing" },
    status: overrides.status ?? "pending",
    priority: overrides.priority ?? "normal",
    attempts: overrides.attempts ?? 0,
    maxAttempts: overrides.maxAttempts ?? 3,
    createdAt: overrides.createdAt ?? new Date(),
    delay: overrides.delay,
    ...overrides,
  };
}

describe("RedisQueue", () => {
  let redis: FakeRedis;
  let queue: RedisQueue<JobData>;

  beforeEach(() => {
    redis = createFakeRedis();
    queue = new RedisQueue<JobData>("test", redis);
  });

  describe("enqueue / getJob", () => {
    it("stores the job and makes it retrievable by id", async () => {
      const job = makeJob({ id: "j1" });
      await queue.enqueue(job);

      const fetched = await queue.getJob("j1");
      expect(fetched?.id).toBe("j1");
      expect(fetched?.data).toEqual({ task: "do-thing" });
    });

    it("returns null for an unknown job id", async () => {
      expect(await queue.getJob("missing")).toBeNull();
    });

    it("adds the job to the pending set", async () => {
      await queue.enqueue(makeJob({ id: "j1" }));
      expect(await redis.zcard("queue:test:pending")).toBe(1);
    });
  });

  describe("dequeue", () => {
    it("returns due jobs and moves them to processing", async () => {
      await queue.enqueue(makeJob({ id: "j1" }));
      await queue.enqueue(makeJob({ id: "j2" }));

      const jobs = await queue.dequeue(10);
      const ids = jobs.map((j) => j.id).sort();
      expect(ids).toEqual(["j1", "j2"]);

      // Moved out of pending and into processing.
      expect(await redis.zcard("queue:test:pending")).toBe(0);
      expect(await redis.zcard("queue:test:processing")).toBe(2);
    });

    it("respects the count limit", async () => {
      await queue.enqueue(makeJob({ id: "j1" }));
      await queue.enqueue(makeJob({ id: "j2" }));
      await queue.enqueue(makeJob({ id: "j3" }));

      const jobs = await queue.dequeue(2);
      expect(jobs).toHaveLength(2);
      expect(await redis.zcard("queue:test:pending")).toBe(1);
    });

    it("returns an empty array when nothing is due", async () => {
      expect(await queue.dequeue(5)).toEqual([]);
    });

    it("does not return jobs whose delay has not elapsed", async () => {
      // A large delay pushes the score far into the future.
      await queue.enqueue(makeJob({ id: "delayed", delay: 60_000 }));
      expect(await queue.dequeue(5)).toEqual([]);
      // It is still pending, just not yet due.
      expect(await redis.zcard("queue:test:pending")).toBe(1);
    });

    it("orders higher-priority jobs ahead of lower-priority ones", async () => {
      // Priority lowers the score (score = now + delay - priority*1000), and
      // dequeue/zrangebyscore returns ascending score, so critical comes first.
      await queue.enqueue(makeJob({ id: "low", priority: "low" }));
      await queue.enqueue(makeJob({ id: "critical", priority: "critical" }));

      const jobs = await queue.dequeue(10);
      expect(jobs[0]?.id).toBe("critical");
      expect(jobs[1]?.id).toBe("low");
    });

    it("never delivers the same job to concurrent dequeues", async () => {
      await queue.enqueue(makeJob({ id: "j1" }));
      await queue.enqueue(makeJob({ id: "j2" }));

      // The claim runs as one atomic script, so parallel workers can't both
      // read the same pending ids before either removes them.
      const [a, b] = await Promise.all([queue.dequeue(10), queue.dequeue(10)]);
      const ids = [...a, ...b].map((j) => j.id);
      expect(ids.sort()).toEqual(["j1", "j2"]);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("visibility timeout", () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    it("redelivers unacked jobs after visibilityTimeoutMs", async () => {
      const vtQueue = new RedisQueue<JobData>("test", redis, {
        visibilityTimeoutMs: 5,
      });
      await vtQueue.enqueue(makeJob({ id: "j1" }));

      const first = await vtQueue.dequeue(10);
      expect(first.map((j) => j.id)).toEqual(["j1"]);
      expect(await vtQueue.dequeue(10)).toEqual([]); // still claimed

      await sleep(15);

      // Claim expired: the job returns to pending and is claimed again.
      const second = await vtQueue.dequeue(10);
      expect(second.map((j) => j.id)).toEqual(["j1"]);
      expect(await redis.zcard("queue:test:processing")).toBe(1);
    });

    it("does not redeliver jobs acked via updateStatus", async () => {
      const vtQueue = new RedisQueue<JobData>("test", redis, {
        visibilityTimeoutMs: 5,
      });
      const job = makeJob({ id: "j1" });
      await vtQueue.enqueue(job);
      await vtQueue.dequeue(10);

      await vtQueue.updateStatus({ ...job, status: "completed" });
      await sleep(15);

      expect(await vtQueue.dequeue(10)).toEqual([]);
      const stats = await vtQueue.getStats();
      expect(stats.completed).toBe(1);
      expect(stats.processing).toBe(0);
    });

    it("leaves claimed jobs in processing when the option is unset (legacy)", async () => {
      await queue.enqueue(makeJob({ id: "j1" }));
      await queue.dequeue(10);

      await sleep(15);

      expect(await queue.dequeue(10)).toEqual([]);
      expect(await redis.zcard("queue:test:processing")).toBe(1);
    });
  });

  describe("updateStatus", () => {
    it("moves a completed job out of processing into completed", async () => {
      const job = makeJob({ id: "j1" });
      await queue.enqueue(job);
      await queue.dequeue(1);

      await queue.updateStatus({ ...job, status: "completed" });

      const stats = await queue.getStats();
      expect(stats.completed).toBe(1);
      expect(stats.processing).toBe(0);

      // The persisted job reflects the new status.
      const fetched = await queue.getJob("j1");
      expect(fetched?.status).toBe("completed");
    });

    it("routes failed jobs to the failed set", async () => {
      const job = makeJob({ id: "j1" });
      await queue.enqueue(job);
      await queue.dequeue(1);

      await queue.updateStatus({ ...job, status: "failed" });

      const stats = await queue.getStats();
      expect(stats.failed).toBe(1);
    });

    it("routes retrying jobs back to the pending set", async () => {
      const job = makeJob({ id: "j1" });
      await queue.enqueue(job);
      await queue.dequeue(1);

      await queue.updateStatus({ ...job, status: "retrying" });

      const stats = await queue.getStats();
      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(0);
    });
  });

  describe("failure lifecycle (retry then dead-letter)", () => {
    it("retries a failed attempt and dead-letters after maxAttempts", async () => {
      const job = makeJob({ id: "j1", maxAttempts: 2 });
      await queue.enqueue(job);

      // Attempt 1: worker claims the job.
      const [claimed] = await queue.dequeue(1);
      expect(claimed?.id).toBe("j1");
      expect(await redis.zcard("queue:test:pending")).toBe(0);
      expect(await redis.zcard("queue:test:processing")).toBe(1);

      // Attempt 1 fails below maxAttempts: the worker requeues it as retrying.
      await queue.updateStatus({
        ...job,
        status: "retrying",
        attempts: 1,
        error: "boom",
      });

      // Back in pending, out of processing, and NOT in the failed set.
      expect(await redis.zrange("queue:test:pending", 0, -1)).toEqual(["j1"]);
      expect(await redis.zcard("queue:test:processing")).toBe(0);
      expect(await redis.zcard("queue:test:failed")).toBe(0);

      // The persisted job carries the attempt count and error forward.
      const afterRetry = await queue.getJob("j1");
      expect(afterRetry?.status).toBe("retrying");
      expect(afterRetry?.attempts).toBe(1);
      expect(afterRetry?.error).toBe("boom");

      // Attempt 2: the retried job is re-delivered by a later dequeue.
      const [redelivered] = await queue.dequeue(1);
      expect(redelivered?.id).toBe("j1");
      expect(redelivered?.attempts).toBe(1);
      expect(await redis.zcard("queue:test:processing")).toBe(1);

      // Attempt 2 exhausts maxAttempts: the worker dead-letters it as failed.
      await queue.updateStatus({
        ...job,
        status: "failed",
        attempts: 2,
        error: "boom again",
      });

      // Terminal state: only the failed set holds the job.
      expect(await redis.zrange("queue:test:failed", 0, -1)).toEqual(["j1"]);
      expect(await queue.getStats()).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 1,
      });

      // The dead-lettered job keeps its final error and is not re-delivered.
      const deadLettered = await queue.getJob("j1");
      expect(deadLettered?.status).toBe("failed");
      expect(deadLettered?.attempts).toBe(2);
      expect(deadLettered?.error).toBe("boom again");
      expect(await queue.dequeue(10)).toEqual([]);
    });
  });

  describe("terminal-set retention", () => {
    it("trims the completed set to maxCompletedEntries, dropping the oldest", async () => {
      const capped = new RedisQueue<JobData>("test", redis, {
        maxCompletedEntries: 3,
      });
      // Seed four already-completed entries with increasing scores (oldest = lowest).
      for (const [score, id] of [
        [1, "c1"],
        [2, "c2"],
        [3, "c3"],
        [4, "c4"],
      ] as const) {
        await redis.zadd("queue:test:completed", score, id);
      }

      // A new completion (score = Date.now(), the highest) triggers a trim to 3.
      await capped.updateStatus({
        ...makeJob({ id: "c5" }),
        status: "completed",
      });

      expect(await redis.zcard("queue:test:completed")).toBe(3);
      // The two oldest (c1, c2) are gone; the three newest survive.
      expect(await redis.zrange("queue:test:completed", 0, -1)).toEqual([
        "c3",
        "c4",
        "c5",
      ]);
    });

    it("trims the failed set to maxFailedEntries", async () => {
      const capped = new RedisQueue<JobData>("test", redis, {
        maxFailedEntries: 2,
      });
      for (const [score, id] of [
        [1, "f1"],
        [2, "f2"],
        [3, "f3"],
      ] as const) {
        await redis.zadd("queue:test:failed", score, id);
      }

      await capped.updateStatus({ ...makeJob({ id: "f4" }), status: "failed" });

      expect(await redis.zcard("queue:test:failed")).toBe(2);
      expect(await redis.zrange("queue:test:failed", 0, -1)).toEqual([
        "f3",
        "f4",
      ]);
    });

    it("does not trim under the generous default cap", async () => {
      // Default queue (no options) keeps everything well under the 10k default.
      for (let i = 0; i < 5; i++) {
        await queue.updateStatus({
          ...makeJob({ id: `d${i}` }),
          status: "completed",
        });
      }
      expect(await redis.zcard("queue:test:completed")).toBe(5);
    });

    it("leaves the set unbounded when the cap is set to 0", async () => {
      const uncapped = new RedisQueue<JobData>("test", redis, {
        maxCompletedEntries: 0,
      });
      await redis.zadd("queue:test:completed", 1, "c1");
      await redis.zadd("queue:test:completed", 2, "c2");

      await uncapped.updateStatus({
        ...makeJob({ id: "c3" }),
        status: "completed",
      });

      // No trimming happened even though 3 > any small implicit bound.
      expect(await redis.zcard("queue:test:completed")).toBe(3);
    });
  });

  describe("cancelJob", () => {
    it("removes a pending job and returns true", async () => {
      await queue.enqueue(makeJob({ id: "j1" }));

      expect(await queue.cancelJob("j1")).toBe(true);
      expect(await redis.zcard("queue:test:pending")).toBe(0);
      expect(await queue.getJob("j1")).toBeNull();
    });

    it("returns false when the job is not pending", async () => {
      // Never enqueued.
      expect(await queue.cancelJob("missing")).toBe(false);

      // Already dequeued (in processing, not pending).
      await queue.enqueue(makeJob({ id: "j2" }));
      await queue.dequeue(1);
      expect(await queue.cancelJob("j2")).toBe(false);
    });
  });

  describe("getStats", () => {
    it("counts jobs across all sets", async () => {
      await queue.enqueue(makeJob({ id: "p1" }));
      await queue.enqueue(makeJob({ id: "p2" }));
      await queue.dequeue(1); // one moves to processing

      const stats = await queue.getStats();
      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it("returns all zeros for an empty queue", async () => {
      expect(await queue.getStats()).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe("clear", () => {
    it("removes all jobs and sets", async () => {
      const job = makeJob({ id: "j1" });
      await queue.enqueue(job);
      await queue.enqueue(makeJob({ id: "j2" }));
      await queue.dequeue(1);
      await queue.updateStatus({ ...job, status: "completed" });

      await queue.clear();

      const stats = await queue.getStats();
      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });
      expect(await queue.getJob("j1")).toBeNull();
      expect(await queue.getJob("j2")).toBeNull();
    });
  });
});
