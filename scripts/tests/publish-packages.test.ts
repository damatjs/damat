import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  distTagFor,
  publicationSummary,
  publicationVerb,
  publishCommand,
} from "../publish/commands";
import { discoverPackages } from "../publish/workspaces";

describe("prerelease publishing", () => {
  test("discovers auth with provider bases and excludes archived codegen", () => {
    const packages = discoverPackages(resolve(import.meta.dir, "../.."));
    const auth = packages.filter(({ name }) => name === "@damatjs/auth");
    expect(auth).toHaveLength(1);
    expect(auth[0]?.dir.endsWith("provider/auth")).toBe(true);
    const archived = "@damatjs/" + "codegen";
    expect(packages.some(({ name }) => name === archived)).toBe(false);
  });

  test("derives npm tags from SemVer prerelease identifiers", () => {
    expect(distTagFor("1.0.0-beta.0")).toBe("beta");
    expect(distTagFor("2.2.0-rc.1")).toBe("rc");
    expect(distTagFor("1.0.0")).toBeUndefined();
  });

  test("supports a validated explicit dist-tag", () => {
    expect(distTagFor("1.0.0-beta.0", "next")).toBe("next");
    expect(() => distTagFor("1.0.0-beta.0", "1.0.0")).toThrow(
      'Invalid npm dist-tag "1.0.0"',
    );
  });

  test("never allows a prerelease to move latest", () => {
    expect(() => distTagFor("1.0.0-beta.0", "latest")).toThrow(
      'Prerelease 1.0.0-beta.0 cannot use npm dist-tag "latest"',
    );
  });

  test("publishes beta tarballs without moving latest", () => {
    const command = publishCommand("package.tgz", "1.0.0-beta.0", {
      dryRun: true,
      provenance: true,
    });
    expect(command).toEqual([
      "npm",
      "publish",
      "package.tgz",
      "--access",
      "public",
      "--tag",
      "beta",
      "--provenance",
      "--dry-run",
    ]);
  });

  test("leaves stable releases on npm's default tag", () => {
    expect(
      publishCommand("package.tgz", "1.0.0", {
        dryRun: false,
        provenance: false,
      }),
    ).not.toContain("--tag");
  });

  test("never reports a dry run as an actual publication", () => {
    expect(publicationVerb(true)).toBe("dry-run validated");
    expect(publicationSummary(40, true)).toBe("40 validated by dry run");
    expect(publicationVerb(false)).toBe("published");
  });
});
