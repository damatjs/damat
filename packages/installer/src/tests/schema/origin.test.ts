import { describe, expect, test } from "bun:test";
import { parseOriginRequest } from "../../index";

describe("parseOriginRequest", () => {
  test.each([
    { type: "local", path: "./artifact" },
    { type: "git", url: "https://example.com/repo.git" },
    { type: "registry", ref: "auth@stable" },
    { type: "npm", name: "@scope/package" },
    { type: "tarball", url: "https://example.com/archive.tgz" },
  ])("accepts a valid $type request", (request) => {
    expect(parseOriginRequest(request)).toEqual(request);
  });

  test("preserves supported optional fields", () => {
    expect(
      parseOriginRequest({
        type: "git",
        url: "git@example.com:owner/repo.git",
        ref: "v1.0.0",
        subdir: "packages/blade",
      }),
    ).toEqual({
      type: "git",
      url: "git@example.com:owner/repo.git",
      ref: "v1.0.0",
      subdir: "packages/blade",
    });
    expect(
      parseOriginRequest({
        type: "npm",
        name: "blade",
        version: "latest",
        registryUrl: "https://registry.example.com",
      }),
    ).toEqual({
      type: "npm",
      name: "blade",
      version: "latest",
      registryUrl: "https://registry.example.com",
    });
    expect(
      parseOriginRequest({
        type: "tarball",
        url: "file:///artifact.tgz",
        integrity: "sha256-test",
      }),
    ).toEqual({
      type: "tarball",
      url: "file:///artifact.tgz",
      integrity: "sha256-test",
    });
  });

  test.each([
    { type: "local", path: "" },
    { type: "git", url: " " },
    { type: "registry", ref: "" },
    { type: "npm", name: "" },
    { type: "tarball", url: "" },
  ])("rejects an empty required string for $type", (request) => {
    expect(() => parseOriginRequest(request)).toThrow();
  });

  test.each(["/absolute", "../escape", "nested/../../escape", "C:\\escape"])(
    "rejects unsafe Git subdir %s",
    (subdir) => {
      expect(() =>
        parseOriginRequest({ type: "git", url: "repo", subdir }),
      ).toThrow("subdir");
    },
  );

  test("rejects unknown types and fields", () => {
    expect(() => parseOriginRequest({ type: "github", url: "repo" })).toThrow(
      "type",
    );
    expect(() =>
      parseOriginRequest({ type: "local", path: ".", hook: "run" }),
    ).toThrow("hook");
  });
});
