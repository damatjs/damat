import { expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withConfig } from "../config";

test("config accessors cache and clear independently", async () => {
  const cwd = join(tmpdir(), `damat-config-${crypto.randomUUID()}`);
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(cwd, "one.config"), "one");
  writeFileSync(join(cwd, "two.config"), "two");
  let oneLoads = 0;
  let twoLoads = 0;
  const one = withConfig(
    { file: "one.config", load: async () => ({ load: ++oneLoads }) },
    cwd,
  );
  const two = withConfig(
    { file: "two.config", load: async () => ({ load: ++twoLoads }) },
    cwd,
  );

  try {
    expect(await one.get()).toEqual({ load: 1 });
    expect(await two.get()).toEqual({ load: 1 });
    one.clear();
    expect(await one.get()).toEqual({ load: 2 });
    expect(await two.get()).toEqual({ load: 1 });
    expect(twoLoads).toBe(1);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a null config result is cached", async () => {
  const cwd = join(tmpdir(), `damat-null-config-${crypto.randomUUID()}`);
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(cwd, "empty.config"), "empty");
  let loads = 0;
  const config = withConfig(
    { file: "empty.config", load: async () => (++loads, null) },
    cwd,
  );

  try {
    expect(await config.get()).toBeNull();
    expect(await config.get()).toBeNull();
    expect(loads).toBe(1);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
