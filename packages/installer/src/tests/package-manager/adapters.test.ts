import { describe, expect, test } from "bun:test";
import {
  createPackageManagerAdapter,
  type PackageManagerName,
} from "../../index";

const expectations: Record<
  PackageManagerName,
  { command: string; add: string; remove: string; flag: string; lock: string }
> = {
  bun: {
    command: "bun",
    add: "add",
    remove: "remove",
    flag: "--ignore-scripts",
    lock: "bun.lock",
  },
  npm: {
    command: "npm",
    add: "install",
    remove: "uninstall",
    flag: "--ignore-scripts",
    lock: "package-lock.json",
  },
  pnpm: {
    command: "pnpm",
    add: "add",
    remove: "remove",
    flag: "--ignore-scripts",
    lock: "pnpm-lock.yaml",
  },
  yarn: {
    command: "yarn",
    add: "add",
    remove: "remove",
    flag: "--ignore-scripts",
    lock: "yarn.lock",
  },
};

describe("package-manager adapters", () => {
  test.each(Object.keys(expectations) as PackageManagerName[])(
    "builds safe %s argv",
    (name) => {
      const expected = expectations[name];
      const adapter = createPackageManagerAdapter(name, "/project");
      expect(
        adapter.addCommand({ zod: "^4", "@scope/pkg": "1.0.0" }, false),
      ).toEqual({
        command: expected.command,
        args: [expected.add, expected.flag, "@scope/pkg@1.0.0", "zod@^4"],
        cwd: "/project",
      });
      expect(adapter.removeCommand(["zod"], false)).toEqual({
        command: expected.command,
        args: [expected.remove, expected.flag, "zod"],
        cwd: "/project",
      });
      expect(adapter.touchedFiles("/project")).toEqual([
        "/project/package.json",
        `/project/${expected.lock}`,
      ]);
    },
  );

  test("allows scripts only when explicitly requested", () => {
    const adapter = createPackageManagerAdapter("bun", "/project");
    expect(adapter.addCommand({ zod: "^4" }, true).args).toEqual([
      "add",
      "zod@^4",
    ]);
    expect(adapter.removeCommand(["zod"], true).args).toEqual([
      "remove",
      "zod",
    ]);
  });
});
