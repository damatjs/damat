import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireArtifact } from "../../index";
import { tar, tgz, type TarEntry } from "../fixtures/archive";
import { success } from "../fixtures/runtime";

const run = async () => success;
function response(bytes: Uint8Array) {
  return {
    ok: true,
    status: 200,
    async arrayBuffer() {
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
    },
    async json() {
      return {};
    },
  };
}

describe("tarball acquisition", () => {
  test.each([tar, tgz])(
    "extracts local tar and gzip archives",
    async (pack) => {
      const parent = mkdtempSync(join(tmpdir(), "installer-tar-local-"));
      const archive = join(parent, "blade.tgz");
      writeFileSync(
        archive,
        pack([
          { name: "src/", type: "5" },
          { name: "src/index.ts", body: "export {};" },
        ]),
      );
      const artifact = await acquireArtifact(
        { type: "tarball", url: archive },
        { run, tempRoot: parent },
      );
      expect(readFileSync(join(artifact.rootDir, "src/index.ts"), "utf8")).toBe(
        "export {};",
      );
      const root = artifact.rootDir;
      artifact.cleanup();
      expect(existsSync(root)).toBeFalse();
    },
  );

  test("fetches and extracts a remote archive", async () => {
    const bytes = tar([{ name: "index.ts", body: "remote" }]);
    const fetch = async () => response(bytes);
    const artifact = await acquireArtifact(
      { type: "tarball", url: "https://example.com/blade.tar" },
      { run, fetch },
    );
    expect(readFileSync(join(artifact.rootDir, "index.ts"), "utf8")).toBe(
      "remote",
    );
    artifact.cleanup();
  });

  test.each([
    { name: "/absolute", body: "bad" },
    { name: "../escape", body: "bad" },
    { name: "link", type: "2", link: "../escape" },
    { name: "device", type: "3" },
  ] satisfies TarEntry[])(
    "rejects unsafe archive entry $name",
    async (entry) => {
      const fetch = async () => response(tar([entry]));
      await expect(
        acquireArtifact(
          { type: "tarball", url: "https://example.com/bad.tar" },
          { run, fetch },
        ),
      ).rejects.toThrow();
    },
  );

  test("rejects truncated archives and cleans failed extraction", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "installer-tar-fail-"));
    const fetch = async () => response(Buffer.alloc(200));
    await expect(
      acquireArtifact(
        { type: "tarball", url: "https://example.com/bad.tar" },
        { run, fetch, tempRoot },
      ),
    ).rejects.toThrow("truncated");
    expect(readdirSync(tempRoot)).toEqual([]);
  });
});
