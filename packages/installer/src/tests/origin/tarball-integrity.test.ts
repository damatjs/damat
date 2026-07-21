import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { acquireArtifact } from "../../index";
import { tar } from "../fixtures/archive";
import { success } from "../fixtures/runtime";

const bytes = tar([{ name: "index.ts", body: "verified" }]);
const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
const response = async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  arrayBuffer: async () =>
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
});

test("verifies archive-byte integrity before extraction", async () => {
  const artifact = await acquireArtifact(
    { type: "tarball", url: "https://example.com/valid.tar", integrity },
    { run: async () => success, fetch: response },
  );
  expect(artifact.metadata.expectedIntegrity).toBe(integrity);
  artifact.cleanup();
  await expect(
    acquireArtifact(
      {
        type: "tarball",
        url: "https://example.com/bad.tar",
        integrity: "sha512-bad",
      },
      { run: async () => success, fetch: response },
    ),
  ).rejects.toThrow("integrity mismatch");
});
