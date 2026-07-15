import { describe, expect, test } from "bun:test";
import { runCapabilityTest } from "@damatjs/cli/testing";
import { codegenCliCapability } from "../capability";

describe("codegen capability", () => {
  test("exposes codegen and barrel in order", async () => {
    expect(codegenCliCapability.commands.map(({ name }) => name)).toEqual([
      "codegen",
      "barrel",
    ]);
    const run = await runCapabilityTest(codegenCliCapability, ["--help"]);
    expect(run.output.join("\n")).toContain("codegen");
    expect(run.output.join("\n")).toContain("barrel");
  });
});
