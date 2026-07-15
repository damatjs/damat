import { beforeEach, describe, expect, test } from "bun:test";
import { resetSupportMocks, spawnSyncCalls, state } from "./setup";
import { installPackages, invalidPackageSpecs } from "../index";

beforeEach(resetSupportMocks);

describe("invalidPackageSpecs", () => {
  test("accepts package names and semver ranges", () => {
    expect(invalidPackageSpecs({ zod: "^4.0.0", bare: "" })).toEqual([]);
  });

  test("rejects flags and malformed names", () => {
    for (const name of ["--flag", "a b", "Evil", "../up", ""]) {
      expect(invalidPackageSpecs({ [name]: "latest" })).toHaveLength(1);
    }
    expect(invalidPackageSpecs({ ["a".repeat(215)]: "1" })).toHaveLength(1);
  });

  test("rejects remote and whitespace ranges by default", () => {
    const invalid = invalidPackageSpecs({ pkg: "file:../local" });
    expect(invalid[0]).toContain("--allow-unverified");
    expect(invalidPackageSpecs({ pkg: "1.0.0 next" })).toHaveLength(1);
  });

  test("allows explicit remote ranges but not shell whitespace", () => {
    expect(
      invalidPackageSpecs(
        { pkg: "git+https://github.com/a/b.git" },
        { allowUnsafeRanges: true },
      ),
    ).toEqual([]);
    expect(
      invalidPackageSpecs(
        { pkg: "1.0.0; rm -rf /" },
        { allowUnsafeRanges: true },
      ),
    ).toHaveLength(1);
  });
});

describe("installPackages", () => {
  test("does nothing for an empty package map", () => {
    expect(installPackages("/app", {})).toEqual({ ok: true, output: "" });
    expect(spawnSyncCalls).toEqual([]);
  });

  test("installs pinned and bare packages without scripts", () => {
    expect(installPackages("/app", { zod: "^4", hono: "*" }).ok).toBe(true);
    expect(spawnSyncCalls[0]).toEqual({
      cmd: "bun",
      args: ["add", "--ignore-scripts", "zod@^4", "hono"],
    });
  });

  test("allows scripts only when requested", () => {
    installPackages("/app", { zod: "latest" }, { allowScripts: true });
    expect(spawnSyncCalls[0]?.args).toEqual(["add", "zod@latest"]);
  });

  test("returns combined output from a failed install", () => {
    state.spawnSyncResult = { status: 1, stdout: "out", stderr: "err" };
    expect(installPackages("/app", { zod: "1" })).toEqual({
      ok: false,
      output: "outerr",
    });
  });
});
