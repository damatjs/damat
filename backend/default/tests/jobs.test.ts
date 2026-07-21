import { describe, expect, mock, test } from "bun:test";
import type { JobRunContext } from "@damatjs/framework";
import { GENERATE_REPORT_JOB, generateReportJob } from "@/jobs";

function context() {
  const progress = mock(async () => undefined);
  const log = mock(async () => undefined);
  return {
    progress,
    log,
    value: {
      runId: "run_1",
      attempt: 1,
      maxAttempts: 3,
      queue: "reports",
      metadata: {},
      signal: new AbortController().signal,
      progress,
      log,
    } as JobRunContext,
  };
}

describe("reference report job", () => {
  test("registers the reports queue contract", () => {
    expect(GENERATE_REPORT_JOB).toBe("reports.generate");
    expect(generateReportJob.name).toBe(GENERATE_REPORT_JOB);
    expect(generateReportJob.options.queue).toBe("reports");
    expect(generateReportJob.options.maxAttempts).toBe(3);
  });

  test("reports progress and structured logs", async () => {
    const ctx = context();
    const result = await generateReportJob.handler(
      { reportId: "rep_1", requestedBy: "usr_1" },
      ctx.value,
    );
    expect(ctx.progress.mock.calls.map(([value]) => value)).toEqual([
      { percent: 25, phase: "collecting" },
      { percent: 75, phase: "rendering" },
      { percent: 100, phase: "complete" },
    ]);
    expect(ctx.log).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ reportId: "rep_1", status: "generated" });
  });
});
