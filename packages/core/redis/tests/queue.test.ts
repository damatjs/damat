import { describe, it, expect, beforeEach } from "bun:test";
import { RedisQueue, type QueueJob } from "../src/index";
import { createFakeRedis, type FakeRedis } from "./helpers/fakeRedis";

type JobData = { task: string };

function makeJob(overrides: Partial<QueueJob<JobData>> = {}): QueueJob<JobData> {
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
