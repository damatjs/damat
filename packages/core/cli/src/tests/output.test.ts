import { describe, expect, test } from "bun:test";
import {
  formatCommandHelp,
  printError,
  printInfo,
  printSection,
  printSuccess,
} from "../utils/output";
import { createRuntimeFixture } from "./runtimeFixture";

describe("output helpers", () => {
  test("formats command help with optional usage", () => {
    expect(formatCommandHelp("build", "Build")).toContain("Build");
    expect(formatCommandHelp("build", "Build", "build app")).toContain(
      "Usage: build app",
    );
  });

  test("printError writes spacing and an optional suggestion", () => {
    const fixture = createRuntimeFixture();
    printError(
      fixture.runtime.logger,
      fixture.runtime.output,
      "failed",
      "try again",
    );
    expect(fixture.errors).toEqual(["failed"]);
    expect(fixture.messages).toEqual(["", "", "try again", ""]);
  });

  test("printError omits an absent suggestion", () => {
    const fixture = createRuntimeFixture();
    printError(fixture.runtime.logger, fixture.runtime.output, "failed");
    expect(fixture.messages).toEqual(["", ""]);
  });

  test("info and success helpers write optional details", () => {
    const info = createRuntimeFixture();
    printInfo(info.runtime.logger, info.runtime.output, "info", "details");
    expect(info.infos).toEqual(["info"]);
    expect(info.messages).toEqual(["", "details", ""]);

    const success = createRuntimeFixture();
    printSuccess(
      success.runtime.logger,
      success.runtime.output,
      "done",
      "created",
    );
    expect(success.successes).toEqual(["done"]);
    expect(success.messages).toEqual(["", "created", ""]);
  });

  test("section writes a title and indented content", () => {
    const fixture = createRuntimeFixture();
    printSection(fixture.runtime.output, "Files", ["one", "two"]);
    expect(fixture.messages).toEqual(["\nFiles:", "  one", "  two"]);
  });
});
