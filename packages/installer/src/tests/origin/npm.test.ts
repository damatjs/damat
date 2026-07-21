import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { acquireArtifact } from "../../index";
import { tar } from "../fixtures/archive";
import { success } from "../fixtures/runtime";

const archive = tar([{ name: "package/index.ts", body: "npm" }]);
const integrity = `sha512-${createHash("sha512").update(archive).digest("base64")}`;
const metadata = {
  "dist-tags": { latest: "1.2.3" },
  versions: {
    "1.2.3": {
      dist: {
        tarball: "https://cdn.example.com/pkg.tgz",
        integrity,
      },
    },
  },
};

function response(value: unknown, bytes = archive) {
  return {
    ok: true,
    status: 200,
    async json() {
      return value;
    },
    async arrayBuffer() {
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
    },
  };
}

describe("npm acquisition", () => {
  test.each([undefined, "latest", "1.2.3"])(
    "resolves %s to one exact package version",
    async (version) => {
      const urls: string[] = [];
      const fetch = async (url: string) => {
        urls.push(url);
        return url.includes("cdn") ? response({}, archive) : response(metadata);
      };
      const artifact = await acquireArtifact(
        { type: "npm", name: "@scope/pkg", version },
        { run: async () => success, fetch },
      );
      expect(readFileSync(join(artifact.rootDir, "index.ts"), "utf8")).toBe(
        "npm",
      );
      expect(artifact.packageReference).toBe("@scope/pkg@1.2.3");
      expect(artifact.metadata.expectedIntegrity).toBe(integrity);
      expect(artifact.metadata.selectedVersion).toBe("1.2.3");
      expect(urls).toHaveLength(2);
      artifact.cleanup();
    },
  );

  test("uses an explicit registry and rejects ranges or malformed metadata", async () => {
    const urls: string[] = [];
    const fetch = async (url: string) => (urls.push(url), response(metadata));
    await acquireArtifact(
      { type: "npm", name: "pkg", registryUrl: "https://registry.example.com" },
      { run: async () => success, fetch },
    );
    expect(urls[0]).toBe("https://registry.example.com/pkg");
    await expect(
      acquireArtifact(
        { type: "npm", name: "pkg", version: "^1" },
        { run: async () => success, fetch },
      ),
    ).rejects.toThrow("exact version or dist-tag");
    const badFetch = async () => response({ versions: {} });
    await expect(
      acquireArtifact(
        { type: "npm", name: "pkg" },
        { run: async () => success, fetch: badFetch },
      ),
    ).rejects.toThrow("metadata");
  });
});
