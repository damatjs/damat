import { expect, test } from "bun:test";
import { readPipelineJobRecords } from "../src/inspection/job-records";

test("job record inspection ignores nodes without a durable job", async () => {
  expect(
    await readPipelineJobRecords({} as never, [{} as never], {
      visibility: "full",
    } as never),
  ).toEqual({});
});
