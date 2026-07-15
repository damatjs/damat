import { expect, spyOn, test } from "bun:test";
import { Logger } from "@damatjs/logger";
import { createDamatRuntime } from "../runtime";

test("createDamatRuntime owns Damat process and logger defaults", () => {
  const runtime = createDamatRuntime();

  expect(runtime.args).toEqual(process.argv.slice(2));
  expect(runtime.cwd).toBe(process.cwd());
  expect(runtime.env).toBe(process.env);
  expect(runtime.logger).toBeInstanceOf(Logger);
  expect(
    (runtime.logger as unknown as { timestampEnabled: boolean })
      .timestampEnabled,
  ).toBe(false);
});

test("Damat output delegates to the console", () => {
  const log = spyOn(console, "log").mockImplementation(() => {});
  try {
    createDamatRuntime().output.write("hello");
    expect(log).toHaveBeenCalledWith("hello");
  } finally {
    log.mockRestore();
  }
});
