import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { printBanner } from "../utils/banner";
import type { CliConfig } from "../types";

describe("printBanner", () => {
  let consoleOutput: string[] = [];
  let originalLog: typeof console.log;

  beforeEach(() => {
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("should print boxed banner by default", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    printBanner(config);

    const output = consoleOutput.join("\n");
    expect(output).toContain("test-cli");
    expect(output).toContain("┌");
    expect(output).toContain("└");
  });

  test("should not print banner when style is 'none'", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    printBanner(config, { style: "none" });

    expect(consoleOutput.length).toBe(0);
  });

  test("should print minimal banner", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    printBanner(config, { style: "minimal" });

    const output = consoleOutput.join("\n");
    expect(output).toContain("test-cli");
    expect(output).not.toContain("┌");
    expect(output).not.toContain("└");
  });

  test("should use custom title", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    printBanner(config, { title: "Custom Title" });

    const output = consoleOutput.join("\n");
    expect(output).toContain("Custom Title");
  });

  test("should include subtitle", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      description: "Test CLI description",
      commands: [],
    };

    printBanner(config);

    const output = consoleOutput.join("\n");
    expect(output).toContain("test-cli");
    expect(output).toContain("Test CLI description");
  });

  test("should use custom subtitle", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    printBanner(config, { subtitle: "Custom Subtitle" });

    const output = consoleOutput.join("\n");
    expect(output).toContain("Custom Subtitle");
  });
});
