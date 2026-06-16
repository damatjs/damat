import { describe, it, expect, afterEach } from "bun:test";
import { getCurrentOs } from "../gets/CurrentOs";

const originalPlatform = process.platform;

function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, "platform", {
    value: platform,
    configurable: true,
  });
}

describe("getCurrentOs", () => {
  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  it("should return 'macos' on darwin", () => {
    setPlatform("darwin");
    expect(getCurrentOs()).toBe("macos");
  });

  it("should return 'linux' on linux", () => {
    setPlatform("linux");
    expect(getCurrentOs()).toBe("linux");
  });

  it("should return 'windows' on win32", () => {
    setPlatform("win32");
    expect(getCurrentOs()).toBe("windows");
  });

  it("should default unknown platforms to 'windows'", () => {
    setPlatform("freebsd");
    expect(getCurrentOs()).toBe("windows");
    setPlatform("aix" as NodeJS.Platform);
    expect(getCurrentOs()).toBe("windows");
  });

  it("should report the real platform after the override is restored", () => {
    setPlatform("darwin");
    expect(getCurrentOs()).toBe("macos");
    // simulate restore (mirrors afterEach behavior)
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
    const expected =
      originalPlatform === "darwin"
        ? "macos"
        : originalPlatform === "linux"
          ? "linux"
          : "windows";
    expect(getCurrentOs()).toBe(expected);
  });
});
