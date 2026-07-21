import { clearJobDefinitions, defineJob } from "../../src/definitions/registry";
import { ensureStorage, pool, uniqueName } from "../storage/context";

export { pool, uniqueName };

export async function prepareSchedules(): Promise<void> {
  await ensureStorage();
  clearJobDefinitions();
}

export function scheduleInput(kind: "once" | "interval" = "once") {
  const name = uniqueName("schedule");
  const jobName = uniqueName("schedule-job");
  defineJob(jobName, async () => {});
  return {
    name,
    jobName,
    payload: { name },
    schedule:
      kind === "once"
        ? ({ kind, at: new Date(Date.now() - 1_000) } as const)
        : ({
            kind,
            everyMs: 60_000,
            startsAt: new Date(Date.now() - 1_000),
          } as const),
  };
}
