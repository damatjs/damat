import { expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { captureInverse, createJournal, recoverTransaction } from "../../index";
import { tempProject } from "../fixtures/project";

test("recovers a surviving journal on the next invocation", async () => {
  const project = tempProject({ "file.txt": "before" });
  const journal = createJournal(project, "crashed");
  journal.append(captureInverse(project, "file.txt"));
  writeFileSync(join(project, "file.txt"), "after");
  const warnings: string[] = [];
  const runtime = {
    run: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
    logger: {
      info() {},
      warn(message: string) {
        warnings.push(message);
      },
      error() {},
    },
  };
  const result = await recoverTransaction(project, runtime);
  expect(result).toMatchObject({
    recovered: true,
    transactionId: "crashed",
    nodeModules: "best-effort",
  });
  expect(readFileSync(join(project, "file.txt"), "utf8")).toBe("before");
  expect(warnings[0]).toContain("best-effort");
});
