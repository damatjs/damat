import { describe, expect, test } from "bun:test";
import { formatCommandLine } from "../help/formatCommandLine";
import { formatOptionLine } from "../help/formatOptionLine";

describe("formatCommandLine", () => {
  test("formats descriptions and aliases", () => {
    const line = formatCommandLine({
      name: "build",
      description: "Build",
      aliases: ["b"],
      handler: async () => ({ exitCode: 0 }),
    });
    expect(line).toContain("build");
    expect(line).toContain("Build");
    expect(line).toContain("aliases: b");
  });

  test("omits aliases when none are configured", () => {
    const line = formatCommandLine({
      name: "build",
      description: "Build",
      aliases: [],
      handler: async () => ({ exitCode: 0 }),
    });
    expect(line).not.toContain("aliases:");
  });
});

describe("formatOptionLine", () => {
  test("formats aliases, defaults, and required markers", () => {
    const line = formatOptionLine({
      name: "port",
      alias: "p",
      description: "Port",
      default: 3000,
      required: true,
    });
    expect(line).toContain("-p, --port");
    expect(line).toContain("default: 3000");
    expect(line).toContain("[required]");
  });

  test("formats a long option without optional suffixes", () => {
    const line = formatOptionLine({ name: "force", description: "Force" });
    expect(line).toContain("--force");
    expect(line).not.toContain("default:");
    expect(line).not.toContain("[required]");
  });

  test("retains falsy defaults", () => {
    expect(formatOptionLine({ name: "cache", default: false })).toContain(
      "default: false",
    );
  });
});
