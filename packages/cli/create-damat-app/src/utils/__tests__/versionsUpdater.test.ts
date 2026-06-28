import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from "bun:test";
import { PackageVersionsUpdate } from "../package/versionsUpdater";

import * as realFsMod from "fs";
const REAL_FS = { ...realFsMod };

describe("PackageVersionsUpdate", () => {
  it("should update @damatjs/* dependencies to the target version", () => {
    const pkg = {
      dependencies: {
        "@damatjs/core": "^1.0.0",
        "@damatjs/cli": "0.0.1",
      },
    };

    const result = PackageVersionsUpdate(pkg, "2.5.0");

    expect(result.dependencies["@damatjs/core"]).toBe("2.5.0");
    expect(result.dependencies["@damatjs/cli"]).toBe("2.5.0");
  });

  it("should leave non-@damatjs dependencies untouched", () => {
    const pkg = {
      dependencies: {
        "@damatjs/core": "^1.0.0",
        express: "^4.18.0",
        slugify: "1.6.6",
      },
    };

    const result = PackageVersionsUpdate(pkg, "3.0.0");

    expect(result.dependencies.express).toBe("^4.18.0");
    expect(result.dependencies.slugify).toBe("1.6.6");
    expect(result.dependencies["@damatjs/core"]).toBe("3.0.0");
  });

  it("should NOT update @damatjs/ui (it follows different versioning)", () => {
    const pkg = {
      dependencies: {
        "@damatjs/ui": "^1.0.0",
        "@damatjs/core": "^1.0.0",
      },
    };

    const result = PackageVersionsUpdate(pkg, "9.9.9");

    expect(result.dependencies["@damatjs/ui"]).toBe("^1.0.0");
    expect(result.dependencies["@damatjs/core"]).toBe("9.9.9");
  });

  it("should update @damatjs/* devDependencies too", () => {
    const pkg = {
      devDependencies: {
        "@damatjs/test-utils": "^1.0.0",
        "@damatjs/ui": "^1.0.0",
        typescript: "5.0.0",
      },
    };

    const result = PackageVersionsUpdate(pkg, "4.0.0");

    expect(result.devDependencies["@damatjs/test-utils"]).toBe("4.0.0");
    expect(result.devDependencies["@damatjs/ui"]).toBe("^1.0.0");
    expect(result.devDependencies.typescript).toBe("5.0.0");
  });

  it("should handle a package.json with no dependencies blocks", () => {
    const pkg = { name: "thing" };
    expect(() => PackageVersionsUpdate(pkg, "1.0.0")).not.toThrow();
  });

  it("should mutate and return the same object reference (object input)", () => {
    const pkg = { dependencies: { "@damatjs/core": "1.0.0" } };
    const result = PackageVersionsUpdate(pkg, "2.0.0");
    expect(result).toBe(pkg);
  });

  it("should not write to disk when given an object input even with applyChanges", () => {
    // applyChanges only writes when input is a string path. Passing an object
    // with applyChanges must be a no-op write-wise (and must not throw).
    const pkg = { dependencies: { "@damatjs/core": "1.0.0" } };
    expect(() =>
      PackageVersionsUpdate(pkg, "2.0.0", { applyChanges: true }),
    ).not.toThrow();
    expect(pkg.dependencies["@damatjs/core"]).toBe("2.0.0");
  });

  it("should match the @damatjs/ prefix exactly (not substrings)", () => {
    const pkg = {
      dependencies: {
        "not-@damatjs/core": "^1.0.0",
        "@damatjsx/core": "^1.0.0",
      },
    };

    const result = PackageVersionsUpdate(pkg, "5.0.0");

    expect(result.dependencies["not-@damatjs/core"]).toBe("^1.0.0");
    expect(result.dependencies["@damatjsx/core"]).toBe("^1.0.0");
  });
});

// The string-path branch reads a package.json from disk and (when applyChanges)
// writes it back. Boundary-mock fs so nothing touches disk; restore in afterAll.
describe("PackageVersionsUpdate (string path input)", () => {
  let readImpl: (p: string, enc: string) => string = () =>
    JSON.stringify({ dependencies: { "@damatjs/core": "1.0.0" } });
  const writeCalls: any[] = [];
  const mockReadFileSync = mock((p: string, enc: string) => readImpl(p, enc));
  const mockWriteFileSync = mock((p: string, data: string) => {
    writeCalls.push([p, data]);
  });

  beforeAll(() => {
    mock.module("fs", () => ({
      ...REAL_FS,
      readFileSync: mockReadFileSync,
      writeFileSync: mockWriteFileSync,
    }));
  });

  afterAll(() => {
    mock.module("fs", () => ({ ...REAL_FS }));
  });

  beforeEach(() => {
    writeCalls.length = 0;
    readImpl = () =>
      JSON.stringify({ dependencies: { "@damatjs/core": "1.0.0" } });
    mockReadFileSync.mockClear();
    mockWriteFileSync.mockClear();
  });

  it("should read the package.json from the given path and update versions", () => {
    const result = PackageVersionsUpdate("/proj/package.json", "7.0.0");
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync.mock.calls[0]![0]).toBe("/proj/package.json");
    expect(result.dependencies["@damatjs/core"]).toBe("7.0.0");
  });

  it("should NOT write to disk when applyChanges is false (default)", () => {
    PackageVersionsUpdate("/proj/package.json", "7.0.0");
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("should write the updated package.json back when applyChanges is true", () => {
    PackageVersionsUpdate("/proj/package.json", "8.0.0", {
      applyChanges: true,
    });
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    expect(writeCalls[0]![0]).toBe("/proj/package.json");
    const written = JSON.parse(writeCalls[0]![1]);
    expect(written.dependencies["@damatjs/core"]).toBe("8.0.0");
  });
});
