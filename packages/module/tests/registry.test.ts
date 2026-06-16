import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  parseModuleRef,
  normalizeVersionEntry,
  resolveRegistryEntry,
  resolveRegistryRef,
  evaluateVerification,
  verificationPolicy,
} from "../src";

const INDEX = {
  modules: {
    "acme/foo": {
      source: "./pkgs/foo",
      author: { name: "acme" },
      owner: { namespace: "acme", id: "org_acme", verified: true },
      verification: { status: "verified", verifiedBy: "acme.dev" },
      latest: "1.0.0",
      versions: {
        "1.0.0": { source: "./pkgs/foo-1.0.0", integrity: "sha256-abc" },
        "0.9.0": "./pkgs/foo-0.9.0",
      },
    },
    bar: { source: "./pkgs/bar" },
  },
};

function makeRegistry(): { dir: string; indexFile: string } {
  const dir = mkdtempSync(join(tmpdir(), "damat-registry-"));
  const indexFile = join(dir, "registry.json");
  writeFileSync(indexFile, JSON.stringify(INDEX));
  return { dir, indexFile };
}

describe("normalizeVersionEntry", () => {
  test("coerces a bare string source", () => {
    expect(normalizeVersionEntry("./x")).toEqual({ source: "./x" });
  });
  test("passes an object through", () => {
    expect(normalizeVersionEntry({ source: "./x", integrity: "y" })).toEqual({
      source: "./x",
      integrity: "y",
    });
  });
});

describe("resolveRegistryEntry", () => {
  test("returns null when no registry is configured", async () => {
    expect(await resolveRegistryEntry(parseModuleRef("acme/foo")!, "")).toBeNull();
  });

  test("resolves the default source with owner + verification", async () => {
    const { dir, indexFile } = makeRegistry();
    try {
      const r = await resolveRegistryEntry(parseModuleRef("acme/foo")!, indexFile);
      expect(r?.source).toBe(resolve(dir, "pkgs/foo"));
      expect(r?.owner?.namespace).toBe("acme");
      expect(r?.verification.status).toBe("verified");
      expect(r?.version).toBe("1.0.0"); // from `latest`
      expect(r?.entry.author?.name).toBe("acme");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("resolves a pinned version with its integrity, inheriting verification", async () => {
    const { dir, indexFile } = makeRegistry();
    try {
      const r = await resolveRegistryEntry(parseModuleRef("acme/foo@1.0.0")!, indexFile);
      expect(r?.source).toBe(resolve(dir, "pkgs/foo-1.0.0"));
      expect(r?.integrity).toBe("sha256-abc");
      expect(r?.verification.status).toBe("verified");
      expect(r?.version).toBe("1.0.0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("resolves a version given as a bare string source", async () => {
    const { dir, indexFile } = makeRegistry();
    try {
      const r = await resolveRegistryEntry(parseModuleRef("acme/foo@0.9.0")!, indexFile);
      expect(r?.source).toBe(resolve(dir, "pkgs/foo-0.9.0"));
      expect(r?.integrity).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("defaults verification to unverified when the entry has none", async () => {
    const { dir, indexFile } = makeRegistry();
    try {
      const r = await resolveRegistryEntry(parseModuleRef("bar")!, indexFile);
      expect(r?.source).toBe(resolve(dir, "pkgs/bar"));
      expect(r?.verification.status).toBe("unverified");
      expect(r?.owner).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("throws for an unknown version", async () => {
    const { dir, indexFile } = makeRegistry();
    try {
      await expect(
        resolveRegistryEntry(parseModuleRef("acme/foo@2.0.0")!, indexFile),
      ).rejects.toThrow('no source for version "2.0.0"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns null for an unindexed ref", async () => {
    const { dir, indexFile } = makeRegistry();
    try {
      expect(await resolveRegistryEntry(parseModuleRef("nope")!, indexFile)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("resolveRegistryRef returns just the source string (back-compat)", async () => {
    const { dir, indexFile } = makeRegistry();
    try {
      expect(await resolveRegistryRef(parseModuleRef("bar")!, indexFile)).toBe(
        resolve(dir, "pkgs/bar"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("evaluateVerification", () => {
  test("verified installs cleanly", () => {
    const d = evaluateVerification({ status: "verified" }, "warn");
    expect(d.allowed).toBe(true);
    expect(d.message).toBeUndefined();
  });

  test("rejected / revoked are always blocked, even under 'off'", () => {
    expect(evaluateVerification({ status: "rejected", reason: "malware" }, "off").allowed).toBe(
      false,
    );
    expect(evaluateVerification({ status: "revoked" }, "off").allowed).toBe(false);
    expect(
      evaluateVerification({ status: "rejected", reason: "malware" }, "warn").message,
    ).toContain("malware");
  });

  test("unverified: warn allows-with-message, require blocks, off is silent", () => {
    const warn = evaluateVerification(undefined, "warn");
    expect(warn.allowed).toBe(true);
    expect(warn.status).toBe("unverified");
    expect(warn.message).toBeDefined();

    expect(evaluateVerification(undefined, "require").allowed).toBe(false);

    const off = evaluateVerification(undefined, "off");
    expect(off.allowed).toBe(true);
    expect(off.message).toBeUndefined();
  });

  test("pending is treated like unverified under the policy", () => {
    expect(evaluateVerification({ status: "pending" }, "require").allowed).toBe(false);
    expect(evaluateVerification({ status: "pending" }, "warn").allowed).toBe(true);
  });
});

describe("verificationPolicy", () => {
  test("defaults to warn", () => {
    expect(verificationPolicy({})).toBe("warn");
  });
  test("DAMAT_MODULE_VERIFY wins", () => {
    expect(verificationPolicy({ DAMAT_MODULE_VERIFY: "require" })).toBe("require");
    expect(verificationPolicy({ DAMAT_MODULE_VERIFY: "off" })).toBe("off");
    expect(verificationPolicy({ DAMAT_MODULE_VERIFY: "garbage" })).toBe("warn");
  });
  test("DAMAT_MODULE_REQUIRE_VERIFIED is a boolean shortcut", () => {
    expect(verificationPolicy({ DAMAT_MODULE_REQUIRE_VERIFIED: "true" })).toBe("require");
    expect(verificationPolicy({ DAMAT_MODULE_REQUIRE_VERIFIED: "1" })).toBe("require");
    expect(verificationPolicy({ DAMAT_MODULE_REQUIRE_VERIFIED: "false" })).toBe("warn");
  });
});
