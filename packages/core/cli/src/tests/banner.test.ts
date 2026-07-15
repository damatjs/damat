import { describe, expect, test } from "bun:test";
import { printBanner } from "../utils/banner";
import type { CliDefinition } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

const config: CliDefinition = {
  name: "test-cli",
  version: "1.0.0",
  description: "Test description",
  commands: [],
};

describe("printBanner", () => {
  test("writes a boxed banner with configured defaults", () => {
    const fixture = createRuntimeFixture();
    printBanner(config, fixture.runtime.output);
    const output = fixture.messages.join("\n");
    expect(output).toContain("test-cli");
    expect(output).toContain("Test description");
    expect(output).toContain("┌");
    expect(output).toContain("└");
  });

  test("supports none and minimal styles", () => {
    const none = createRuntimeFixture();
    printBanner(config, none.runtime.output, { style: "none" });
    expect(none.messages).toEqual([]);

    const minimal = createRuntimeFixture();
    printBanner(config, minimal.runtime.output, { style: "minimal" });
    expect(minimal.messages.join("\n")).not.toContain("┌");
  });

  test("uses custom title and subtitle", () => {
    const fixture = createRuntimeFixture();
    printBanner(config, fixture.runtime.output, {
      title: "Custom",
      subtitle: "Subtitle",
    });
    expect(fixture.messages.join("\n")).toContain("Custom");
    expect(fixture.messages.join("\n")).toContain("Subtitle");
  });
});
