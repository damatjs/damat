import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadModuleProviders } from "../../services/moduleProviders";

let root = "";
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete (globalThis as any).__damatProviders;
});

test("loads workflow, job, event, and pipeline providers in order", async () => {
  root = mkdtempSync(join(tmpdir(), "damat-providers-"));
  const resolved: any = {
    root,
    manifest: { name: "billing" },
    entry: join(root, "index.ts"),
    location: root,
    mutable: false,
  };
  for (const name of ["workflows", "jobs", "events", "pipelines"]) {
    const dir = join(root, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "index.ts"),
      `
      globalThis.__damatProviders ??= [];
      globalThis.__damatProviders.push("${name}");
    `,
    );
    resolved[name] = dir;
  }
  await loadModuleProviders(new Map([["billing", resolved]]));
  expect((globalThis as any).__damatProviders).toEqual([
    "workflows",
    "jobs",
    "events",
    "pipelines",
  ]);
});

test("loads a provider declared as a direct file", async () => {
  root = mkdtempSync(join(tmpdir(), "damat-provider-file-"));
  const provider = join(root, "jobs.ts");
  writeFileSync(provider, "globalThis.__damatProviders = ['jobs']");
  await loadModuleProviders(
    new Map([
      [
        "billing",
        {
          root,
          manifest: { name: "billing" },
          entry: join(root, "index.ts"),
          location: root,
          mutable: false,
          jobs: provider,
        } as any,
      ],
    ]),
  );
  expect((globalThis as any).__damatProviders).toEqual(["jobs"]);
});

test("wraps provider directories without a conventional entry", async () => {
  root = mkdtempSync(join(tmpdir(), "damat-provider-missing-"));
  const provider = join(root, "jobs");
  mkdirSync(provider);
  await expect(
    loadModuleProviders(
      new Map([
        [
          "billing",
          {
            root,
            manifest: { name: "billing" },
            entry: join(root, "index.ts"),
            location: root,
            mutable: false,
            jobs: provider,
          } as any,
        ],
      ]),
    ),
  ).rejects.toThrow(/Failed to load jobs provider.*no index/i);
});
