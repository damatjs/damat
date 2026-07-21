import { expect, expectTypeOf, test } from "bun:test";
import type { JobPayload } from "@damatjs/jobs";
import * as jobs from "../src";
import { defineJob as durableDefineJob } from "../src/definitions/registry";

declare module "@damatjs/jobs" {
  interface JobMap {
    "typed-test": { id: string };
  }
}

test("package root exposes one durable definition registry", () => {
  expect(jobs.defineJob).toBe(durableDefineJob);
  expect("getJobQueue" in jobs).toBe(false);
  expect("clearJobQueues" in jobs).toBe(false);
  expect("createInternalJobWorker" in jobs).toBe(false);
  expect(jobs.enqueueJob).toBeFunction();
  expect(jobs.JobWorker).toBeFunction();
  expect(jobs.getJobRun).toBeFunction();
  expect(jobs.createJobSchedule).toBeFunction();
  expect(jobs.updateJobSchedule).toBeFunction();
  expect(jobs.listJobSchedules).toBeFunction();
  expect(jobs.runJobRetention).toBeFunction();
  expect(jobs.createJobInspectionClient).toBeFunction();
  expect(jobs.JobInspectionError).toBeFunction();
  expect(jobs.configureJobWakeupPublisher).toBeFunction();
  expectTypeOf<JobPayload<"typed-test">>().toEqualTypeOf<{ id: string }>();
});
