import { describe, expect, test } from "bun:test";
import { installerOptions } from "../../installer";

const context = (options: Record<string, unknown>) => ({
  command: "kit add", args: [], options, cwd: "/work",
  logger: { debug() {}, info() {}, success() {}, skip() {}, warn() {}, error() {} },
});

describe("installerOptions", () => {
  test("parses independent mode, backend, and target overrides", () => {
    expect(installerOptions(context({
      mode: "package", "package-backend": "damat",
      target: ["routes=src/http", "jobs=src/workers"],
    }))).toEqual({
      mode: "package", packageBackend: "damat",
      targets: { routes: "src/http", jobs: "src/workers" },
    });
  });

  test("rejects malformed target values", () => {
    expect(() => installerOptions(context({ target: "routes" }))).toThrow("capability=path");
  });
});
