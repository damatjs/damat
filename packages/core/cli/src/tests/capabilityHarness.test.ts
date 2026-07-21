import { expect, test } from "bun:test";
import type { CliCapability, CliRunResult } from "../types";
import * as cli from "../index";

interface TestRun {
  result: CliRunResult;
  logs: Array<{ level: string; message: string }>;
  output: string[];
}

test("capability harness runs a package without process state", async () => {
  const capability: CliCapability = {
    name: "sample",
    commands: [
      {
        name: "hello",
        description: "Say hello",
        handler: async (ctx) => {
          ctx.logger.debug("debug");
          ctx.logger.info("info");
          ctx.logger.success("hello");
          ctx.logger.skip("skip");
          ctx.logger.warn("warn");
          ctx.logger.error("error");
          return { exitCode: 4 };
        },
      },
    ],
  };
  const run = Reflect.get(cli, "runCapabilityTest") as (
    value: CliCapability,
    args: readonly string[],
  ) => Promise<TestRun>;

  const result = await run(capability, ["hello"]);

  expect(result.result).toEqual({ exitCode: 4, command: "hello" });
  expect(result.logs).toContainEqual({ level: "success", message: "hello" });
  expect(result.logs).toHaveLength(6);

  const help = await run(capability, ["--help"]);
  expect(help.output?.join("\n")).toContain("hello");
});
