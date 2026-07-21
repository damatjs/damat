import { expect, test } from "bun:test";
import type { WorkspacePackage } from "../publish/types";
import { verifyReleaseTag } from "../verify-release-tag";

function pkg(name: string, version: string): WorkspacePackage {
  return { dir: name, name, version };
}

test("accepts the exact shared prerelease tag", () => {
  expect(
    verifyReleaseTag("v1.0.0-beta.0", [
      pkg("@damatjs/framework", "1.0.0-beta.0"),
      pkg("@damatjs/jobs", "1.0.0-beta.0"),
    ]),
  ).toBe("1.0.0-beta.0");
});

test("accepts the exact shared build-metadata tag", () => {
  expect(
    verifyReleaseTag("v1.0.0+0.2", [
      pkg("@damatjs/framework", "1.0.0+0.2"),
      pkg("@damatjs/jobs", "1.0.0+0.2"),
    ]),
  ).toBe("1.0.0+0.2");
});

test("rejects tag mismatches and shared version drift", () => {
  expect(() =>
    verifyReleaseTag("v1.0.0", [pkg("@damatjs/framework", "1.0.0-beta.0")]),
  ).toThrow("must equal v1.0.0-beta.0");
  expect(() =>
    verifyReleaseTag("v1.0.0-beta.0", [
      pkg("@damatjs/framework", "1.0.0-beta.0"),
      pkg("@damatjs/jobs", "1.0.0-beta.1"),
    ]),
  ).toThrow("versions diverged");
});
