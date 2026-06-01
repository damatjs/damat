import { describe, test, expect } from "bun:test";
import {
  CliError,
  CommandNotFoundError,
  MissingRequiredOptionError,
  ConfigLoadError,
  CommandRegistrationError,
} from "../errors";

describe("CLI Errors", () => {
  test("CliError should have correct properties", () => {
    const error = new CliError("Test error", 2);

    expect(error.message).toBe("Test error");
    expect(error.exitCode).toBe(2);
    expect(error.name).toBe("CliError");
  });

  test("CliError should have default exit code of 1", () => {
    const error = new CliError("Test error");

    expect(error.exitCode).toBe(1);
  });

  test("CommandNotFoundError should format message correctly", () => {
    const error = new CommandNotFoundError("unknown-cmd");

    expect(error.message).toBe("Unknown command: unknown-cmd");
    expect(error.name).toBe("CommandNotFoundError");
    expect(error.exitCode).toBe(1);
  });

  test("MissingRequiredOptionError should format message correctly", () => {
    const error = new MissingRequiredOptionError("output", "build");

    expect(error.message).toBe(
      "Missing required option '--output' for command 'build'"
    );
    expect(error.name).toBe("MissingRequiredOptionError");
    expect(error.exitCode).toBe(1);
  });

  test("ConfigLoadError should format message without cause", () => {
    const error = new ConfigLoadError("config.ts");

    expect(error.message).toBe("Failed to load config from 'config.ts'");
    expect(error.name).toBe("ConfigLoadError");
    expect(error.exitCode).toBe(1);
  });

  test("ConfigLoadError should format message with cause", () => {
    const cause = new Error("File not found");
    const error = new ConfigLoadError("config.ts", cause);

    expect(error.message).toBe(
      "Failed to load config from 'config.ts': File not found"
    );
    expect(error.name).toBe("ConfigLoadError");
  });

  test("CommandRegistrationError should format message correctly", () => {
    const error = new CommandRegistrationError("test", "already registered");

    expect(error.message).toBe(
      "Failed to register command 'test': already registered"
    );
    expect(error.name).toBe("CommandRegistrationError");
    expect(error.exitCode).toBe(1);
  });

  test("all errors should be instances of CliError", () => {
    expect(new CommandNotFoundError("test")).toBeInstanceOf(CliError);
    expect(new MissingRequiredOptionError("opt", "cmd")).toBeInstanceOf(CliError);
    expect(new ConfigLoadError("file")).toBeInstanceOf(CliError);
    expect(new CommandRegistrationError("cmd", "reason")).toBeInstanceOf(CliError);
  });
});
