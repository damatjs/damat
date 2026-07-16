import { expect, test } from "bun:test";
import { cancelJobRun, enqueueJob, retryJobRun } from "../../src/client";
import { durability, ensureStorage, pool, uniqueName } from "./context";

test("cancel and retry accept an active durability transaction", async () => {
  await ensureStorage();
  const cancelRun = await enqueueJob(uniqueName("cancel-executor"), {});
  const cancelled = await durability.transaction((executor) =>
    cancelJobRun(cancelRun.id, { executor }),
  );
  expect(cancelled?.status).toBe("cancelled");

  const retryRun = await enqueueJob(uniqueName("retry-executor"), {});
  await pool.query(
    `UPDATE "_damat_job_runs" SET "status"='dead_lettered' WHERE "id"=$1`,
    [retryRun.id],
  );
  const retried = await durability.transaction((executor) =>
    retryJobRun(retryRun.id, { executor }),
  );
  expect(retried?.status).toBe("queued");
});
