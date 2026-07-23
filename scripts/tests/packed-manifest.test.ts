import { expect, test } from "bun:test";
import { validatePackedManifest } from "../publish/packed-manifest";
import type { WorkspacePackage } from "../publish/types";

const pkg: WorkspacePackage = {
  dir: "/tmp/example",
  name: "@damatjs/example",
  version: "1.0.3",
};

test("accepts exact coordinated runtime dependencies", () => {
  expect(() =>
    validatePackedManifest(
      {
        name: pkg.name,
        version: pkg.version,
        dependencies: { "@damatjs/framework": "1.0.3", hono: "^4.0.0" },
        optionalDependencies: { "@damatjs/redis": "1.0.3" },
        peerDependencies: { "@damatjs/services": "1.0.3" },
      },
      pkg,
    ),
  ).not.toThrow();
});

test("rejects stale internal runtime dependencies", () => {
  expect(() =>
    validatePackedManifest(
      {
        name: pkg.name,
        version: pkg.version,
        dependencies: { "@damatjs/framework": "1.0.2" },
      },
      pkg,
    ),
  ).toThrow("@damatjs/framework@1.0.2; expected 1.0.3");
});

test("checks package identity and ignores development-only pins", () => {
  expect(() =>
    validatePackedManifest({ name: "@damatjs/other", version: "1.0.3" }, pkg),
  ).toThrow("expected @damatjs/example@1.0.3");
  expect(() =>
    validatePackedManifest(
      {
        name: pkg.name,
        version: pkg.version,
        devDependencies: { "@damatjs/typescript-config": "0.0.1" },
      } as never,
      pkg,
    ),
  ).not.toThrow();
});
