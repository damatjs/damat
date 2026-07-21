import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveArtifact,
  type FetchResponse,
  type OriginRequest,
} from "../../index";
import { tar } from "../fixtures/archive";
import { tempProject } from "../fixtures/project";
import { success } from "../fixtures/runtime";

const body = "export const parity = true;";
const archive = tar([{ name: "index.ts", body }]);
const npmArchive = tar([{ name: "package/index.ts", body }]);
const commit = "0123456789abcdef0123456789abcdef01234567";

function response(json: unknown, bytes: Uint8Array): FetchResponse {
  return {
    ok: true,
    status: 200,
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

test("all origins resolve equivalent content with immutable provenance", async () => {
  const local = tempProject({ "index.ts": body });
  const localTar = join(tempProject(), "artifact.tar");
  writeFileSync(localTar, archive);
  const metadata = {
    "dist-tags": { latest: "1.0.0" },
    versions: { "1.0.0": { dist: { tarball: "https://cdn.example/pkg.tgz" } } },
  };
  const fetch = async (url: string) =>
    url.includes("registry")
      ? response(metadata, archive)
      : response({}, url.includes("pkg") ? npmArchive : archive);
  const run = async (spec: { args: string[] }) => {
    if (spec.args[0] === "clone") {
      mkdirSync(spec.args.at(-1)!, { recursive: true });
      writeFileSync(join(spec.args.at(-1)!, "index.ts"), body);
    }
    return spec.args.includes("rev-parse")
      ? { ...success, stdout: commit }
      : success;
  };
  const resolveRegistry = async () => ({
    origin: { type: "local" as const, path: local },
    verification: "verified" as const,
  });
  const origins: OriginRequest[] = [
    { type: "local", path: local },
    { type: "git", url: "https://example.com/repo.git", ref: "main" },
    { type: "registry", ref: "blade@stable" },
    { type: "npm", name: "pkg", registryUrl: "https://registry.example" },
    { type: "tarball", url: localTar },
    { type: "tarball", url: "https://cdn.example/direct.tar" },
  ];
  const artifacts = await Promise.all(
    origins.map((origin) =>
      resolveArtifact(origin, { run, fetch, resolveRegistry }),
    ),
  );
  expect(new Set(artifacts.map(({ integrity }) => integrity)).size).toBe(1);
  expect(
    artifacts.every(({ provenance }) => Boolean(provenance.immutableIdentity)),
  ).toBeTrue();
  expect(artifacts[1]?.packageReference).toEndWith(`#${commit}`);
  expect(artifacts[3]?.packageReference).toBe("pkg@1.0.0");
  expect(createHash("sha256").update(body).digest("hex")).toHaveLength(64);
  artifacts.forEach((artifact) => artifact.cleanup());
});
