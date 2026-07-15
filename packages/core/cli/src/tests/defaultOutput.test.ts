import { describe, expect, spyOn, test } from "bun:test";
import { createDefaultOutput } from "../runtime";

describe("DefaultCliOutput", () => {
  test("writes provided and blank output", () => {
    const log = spyOn(console, "log").mockImplementation(() => {});
    const output = createDefaultOutput();

    output.write("hello");
    output.write();

    expect(log).toHaveBeenNthCalledWith(1, "hello");
    expect(log).toHaveBeenNthCalledWith(2, "");
    log.mockRestore();
  });
});
