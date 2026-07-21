import { describe, expect, test } from "bun:test";
import { parseDamatManifest } from "../../index";

const base = { schemaVersion: 1, kind: "kit", name: "feature" };

describe("damat manifest validation", () => {
  test.each(["Application", "blade", ""])("rejects kind %s", (kind) => {
    expect(() => parseDamatManifest({ ...base, kind })).toThrow("kind");
  });

  test("rejects unknown and executable-looking fields", () => {
    expect(() =>
      parseDamatManifest({ ...base, postinstall: "run.sh" }),
    ).toThrow("unknown field: postinstall");
    expect(() =>
      parseDamatManifest({ ...base, install: { hooks: { add: "run.sh" } } }),
    ).toThrow("unknown field: hooks");
  });

  test.each(["../src", "/src", "src\\code"])(
    "rejects unsafe capability path %s",
    (from) => {
      expect(() =>
        parseDamatManifest({
          ...base,
          install: { provides: { feature: { from } } },
        }),
      ).toThrow("inside its root");
    },
  );

  test("rejects unsupported package backends", () => {
    expect(() =>
      parseDamatManifest({
        ...base,
        install: { packageBackends: ["node", "custom"] },
      }),
    ).toThrow("packageBackends[1]");
  });
});
