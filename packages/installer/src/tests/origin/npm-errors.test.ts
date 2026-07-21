import { expect, test } from "bun:test";
import { acquireArtifact } from "../../index";
import { tar } from "../fixtures/archive";
import { success } from "../fixtures/runtime";

const request = { type: "npm" as const, name: "pkg" };
const metadata = {
  "dist-tags": { latest: "1.0.0" },
  versions: { "1.0.0": { dist: { tarball: "https://cdn/pkg.tgz" } } },
};

function response(
  ok: boolean,
  json: unknown,
  bytes = tar([{ name: "wrong/index.ts", body: "x" }]),
) {
  return {
    ok,
    status: ok ? 200 : 503,
    async json() {
      return json;
    },
    async arrayBuffer() {
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
    },
  };
}

test("npm acquisition reports missing fetch, HTTP failure, and invalid package roots", async () => {
  await expect(
    acquireArtifact(request, { run: async () => success }),
  ).rejects.toThrow("requires fetch");
  await expect(
    acquireArtifact(request, {
      run: async () => success,
      fetch: async () => response(false, {}),
    }),
  ).rejects.toThrow("503");
  const fetch = async (url: string) =>
    url.includes("registry") ? response(true, metadata) : response(true, {});
  await expect(
    acquireArtifact(
      { ...request, registryUrl: "https://registry.example" },
      { run: async () => success, fetch },
    ),
  ).rejects.toThrow("package root");
});
