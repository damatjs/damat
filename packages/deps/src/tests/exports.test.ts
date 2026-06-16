import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * `@damatjs/deps` is a thin re-export layer that pins external dependencies
 * behind stable subpaths (so the rest of the monorepo imports e.g.
 * `@damatjs/deps/zod` instead of `zod` directly).
 *
 * These smoke tests guard the re-export map: if a subpath stops resolving or a
 * dependency drops/renames a key export, the corresponding test fails — which
 * is exactly the regression we want to catch before publishing.
 */

import * as effect from "../effect";
import * as hono from "../hono";
import * as ioredis from "../ioredis";
import * as nanoid from "../nanoid";
import * as pg from "../pg";
import * as uuid from "../uuid";
import * as zod from "../zod";

describe("@damatjs/deps/effect", () => {
  it("re-exports Effect", () => {
    expect(effect.Effect).toBeDefined();
  });
});

describe("@damatjs/deps/hono", () => {
  it("re-exports Hono and the node server `serve`", () => {
    expect(hono.Hono).toBeDefined();
    expect(typeof hono.serve).toBe("function");
  });

  it("re-exports HTTPException, cors and secureHeaders", () => {
    expect(hono.HTTPException).toBeDefined();
    expect(typeof hono.cors).toBe("function");
    expect(typeof hono.secureHeaders).toBe("function");
  });
});

describe("@damatjs/deps/ioredis", () => {
  it("re-exports the Redis class", () => {
    expect(ioredis.Redis).toBeDefined();
    expect(typeof ioredis.Redis).toBe("function");
  });
});

describe("@damatjs/deps/nanoid", () => {
  it("re-exports a working nanoid generator", () => {
    expect(typeof nanoid.nanoid).toBe("function");
    const id = nanoid.nanoid();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("re-exports customAlphabet", () => {
    expect(typeof nanoid.customAlphabet).toBe("function");
    const gen = nanoid.customAlphabet("abc", 5);
    const out = gen();
    expect(out).toHaveLength(5);
    expect(/^[abc]+$/.test(out)).toBe(true);
  });
});

describe("@damatjs/deps/pg", () => {
  it("re-exports Pool and Client", () => {
    expect(pg.Pool).toBeDefined();
    expect(pg.Client).toBeDefined();
  });
});

describe("@damatjs/deps/uuid", () => {
  it("re-exports a working v4 generator and validate", () => {
    expect(typeof uuid.v4).toBe("function");
    const id = uuid.v4();
    expect(uuid.validate(id)).toBe(true);
    expect(uuid.validate("not-a-uuid")).toBe(false);
  });
});

describe("@damatjs/deps/zod", () => {
  it("re-exports zod under the `z` alias", () => {
    expect(zod.z).toBeDefined();
    const schema = zod.z.object({ name: zod.z.string() });
    expect(schema.parse({ name: "ada" })).toEqual({ name: "ada" });
    expect(() => schema.parse({ name: 1 })).toThrow();
  });

  it("also re-exports zod builders at the top level", () => {
    expect(typeof zod.string).toBe("function");
    expect(zod.string().parse("ok")).toBe("ok");
  });
});

describe("@damatjs/deps package.json exports", () => {
  // tests/ lives at <pkg>/src/tests, so the package root is two levels up.
  const pkgRoot = resolve(import.meta.dir, "..", "..");
  const pkg = JSON.parse(
    readFileSync(join(pkgRoot, "package.json"), "utf-8"),
  ) as {
    main: string;
    types: string;
    exports: Record<string, Record<string, string>>;
  };

  // Build the flat list of every file an export condition points at, so the
  // assertion message tells us exactly which subpath/condition is dangling.
  const targets = Object.entries(pkg.exports).flatMap(([subpath, conditions]) =>
    Object.entries(conditions).map(([condition, file]) => ({
      subpath,
      condition,
      file,
    })),
  );

  it.each(targets)(
    "$subpath [$condition] -> $file resolves to a built file",
    ({ file }) => {
      // Every export target must point at a file the build actually emits;
      // a dangling target ships a package consumers cannot import.
      expect(existsSync(join(pkgRoot, file))).toBe(true);
    },
  );

  it("points `main` and `types` at built files", () => {
    expect(existsSync(join(pkgRoot, pkg.main))).toBe(true);
    expect(existsSync(join(pkgRoot, pkg.types))).toBe(true);
  });
});
