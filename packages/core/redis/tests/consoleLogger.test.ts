import { describe, it, expect, spyOn, afterEach } from "bun:test";
import { CONSOLE_LOGGER } from "../src/client/consoleLogger";

describe("CONSOLE_LOGGER", () => {
  const spies: Array<{ mockRestore: () => void }> = [];
  afterEach(() => {
    while (spies.length) spies.pop()!.mockRestore();
  });

  const spy = (method: "debug" | "info" | "warn" | "error") => {
    const s = spyOn(console, method).mockImplementation(() => {});
    spies.push(s);
    return s;
  };

  it("routes debug to console.debug", () => {
    const s = spy("debug");
    CONSOLE_LOGGER.debug("d", { a: 1 });
    expect(s).toHaveBeenCalledWith("d", { a: 1 });
  });

  it("routes info-level methods to console.info", () => {
    const s = spy("info");
    CONSOLE_LOGGER.info("i");
    CONSOLE_LOGGER.waiting("w");
    CONSOLE_LOGGER.progress("p");
    CONSOLE_LOGGER.cached("c");
    CONSOLE_LOGGER.success("s");
    CONSOLE_LOGGER.skip("k");
    expect(s).toHaveBeenCalledTimes(6);
    expect(s).toHaveBeenCalledWith("i", "");
  });

  it("routes warn to console.warn", () => {
    const s = spy("warn");
    CONSOLE_LOGGER.warn("careful", { name: "default" });
    expect(s).toHaveBeenCalledWith("careful", { name: "default" });
  });

  it("routes error and fatal to console.error with the error attached", () => {
    const s = spy("error");
    const boom = new Error("boom");
    CONSOLE_LOGGER.error("failed", boom, { name: "default" });
    CONSOLE_LOGGER.fatal("dead", boom);
    expect(s).toHaveBeenCalledWith("failed", boom, { name: "default" });
    expect(s).toHaveBeenCalledWith("dead", boom, "");
  });

  it("child and withPrefix return a usable logger", () => {
    const s = spy("info");
    CONSOLE_LOGGER.child({ scope: "x" }).info("from child");
    CONSOLE_LOGGER.withPrefix("pre").info("from prefixed");
    expect(s).toHaveBeenCalledTimes(2);
  });

  it("request logs the payload via console.info", () => {
    const s = spy("info");
    const data = { method: "GET", path: "/", statusCode: 200, durationMs: 1 };
    CONSOLE_LOGGER.request(data as never);
    expect(s).toHaveBeenCalledWith("request", data);
  });
});
