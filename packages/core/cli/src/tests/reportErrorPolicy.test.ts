import { expect, test } from "bun:test";
import { reportError } from "../utils/output";
import { createRuntimeFixture } from "./runtimeFixture";

test("error detail depends only on explicit verbose state", () => {
  const fixture = createRuntimeFixture();
  process.env.DAMAT_DEBUG = "1";

  try {
    reportError(
      fixture.runtime.logger,
      fixture.runtime.output,
      new Error("boom"),
      { verbose: false },
    );
    expect(fixture.errors).toEqual(["boom"]);
    expect(fixture.messages.join("\n")).toContain("--verbose");
  } finally {
    delete process.env.DAMAT_DEBUG;
  }
});

test("legacy reportError calls route hints through the logger", () => {
  const fixture = createRuntimeFixture();

  reportError(fixture.runtime.logger, new Error("legacy"), {
    prefix: "Failed",
  });

  expect(fixture.errors).toEqual(["Failed: legacy"]);
  expect(fixture.infos.join("\n")).toContain("--verbose");
});
