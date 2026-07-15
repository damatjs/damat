import { describe, expect, test } from "bun:test";
import { parseGitSource } from "../gitSource";

describe("parseGitSource", () => {
  test("parses URLs and refs", () => {
    expect(parseGitSource("git@github.com:a/b.git#v2")).toEqual({
      repoUrl: "git@github.com:a/b.git",
      subDir: "",
      ref: "v2",
    });
  });

  test("expands GitHub shorthand and subdirectories", () => {
    expect(parseGitSource("acme/mono/examples/api#main")).toEqual({
      repoUrl: "https://github.com/acme/mono.git",
      subDir: "examples/api",
      ref: "main",
    });
  });

  test("rejects unknown source syntax", () => {
    expect(() => parseGitSource("not a source")).toThrow(/neither a git URL/);
  });
});
