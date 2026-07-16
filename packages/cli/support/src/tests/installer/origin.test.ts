import { describe, expect, test } from "bun:test";
import { originFromArgument } from "../../installer";

describe("originFromArgument", () => {
  test("parses explicit origin forms", () => {
    expect(originFromArgument("file:../kit", "/work/app")).toEqual({
      type: "local",
      path: "/work/kit",
    });
    expect(originFromArgument("registry:auth", "/work")).toEqual({
      type: "registry",
      ref: "auth",
    });
    expect(originFromArgument("npm:@scope/auth@1.2.0", "/work")).toEqual({
      type: "npm",
      name: "@scope/auth",
      version: "1.2.0",
    });
    expect(originFromArgument("github:acme/auth#v1", "/work")).toEqual({
      type: "git",
      url: "https://github.com/acme/auth.git",
      ref: "v1",
    });
  });

  test("uses existing paths locally and ambiguous bare refs as registry refs", () => {
    expect(originFromArgument(".", process.cwd()).type).toBe("local");
    expect(originFromArgument("auth", "/work", () => false)).toEqual({
      type: "registry",
      ref: "auth",
    });
    expect(originFromArgument("auth", "/work", () => true)).toEqual({
      type: "local",
      path: "/work/auth",
    });
  });

  test("recognizes git and tarball URLs", () => {
    expect(
      originFromArgument("https://example.com/auth.git", "/work").type,
    ).toBe("git");
    expect(
      originFromArgument("https://example.com/auth.tgz", "/work").type,
    ).toBe("tarball");
  });
});
