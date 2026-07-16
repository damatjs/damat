import { describe, expect, test } from "bun:test";
import { registryDescriptor } from "../../installer/registry";

describe("registryDescriptor", () => {
  const index = {
    modules: {
      "damatjs/auth": {
        source: "github:damatjs/auth",
        owner: { namespace: "damatjs" },
        verification: { status: "verified", integrity: "sha256:abc" },
        versions: {
          "1.0.0": { source: "github:damatjs/auth#v1.0.0" },
          next: "github:damatjs/auth#next",
        },
      },
    },
  };

  test("pins version objects and preserves trust metadata", () => {
    expect(registryDescriptor(index, "damatjs/auth@1.0.0", "/app")).toEqual({
      origin: {
        type: "git",
        url: "https://github.com/damatjs/auth.git",
        ref: "v1.0.0",
      },
      owner: "damatjs",
      verification: "verified",
      integrity: "sha256:abc",
    });
  });

  test("supports short names, string versions, and unverified status", () => {
    const unverified = structuredClone(index);
    unverified.modules["damatjs/auth"].verification.status = "pending";
    expect(registryDescriptor(unverified, "auth@next", "/app")).toMatchObject({
      verification: "unverified",
      origin: { ref: "next" },
    });
  });

  test("rejects missing entries and versions", () => {
    expect(() =>
      registryDescriptor({ modules: {} }, "missing", "/app"),
    ).toThrow("registry entry not found");
    expect(() => registryDescriptor(index, "auth@missing", "/app")).toThrow(
      "registry version not found",
    );
  });
});
