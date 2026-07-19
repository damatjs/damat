import { afterEach, expect, test } from "bun:test";
import {
  chmodSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfigModule } from "../cli/utils/load/configModule";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    chmodSync(root, 0o700);
    rmSync(root, { recursive: true, force: true });
  }
});

test("loads fresh config without writing beside a read-only source", async () => {
  const root = mkdtempSync(join(tmpdir(), "damat-readonly-config-"));
  roots.push(root);
  const config = join(root, "damat.config.ts");
  writeFileSync(config, "export default { marker: 1 };\n");
  const before = readdirSync(root);
  chmodSync(root, 0o500);
  expect((await loadConfigModule(config)).default.marker).toBe(1);
  expect(readdirSync(root)).toEqual(before);
  chmodSync(root, 0o700);
  writeFileSync(config, "export default { marker: 2 };\n");
  chmodSync(root, 0o500);
  expect((await loadConfigModule(config)).default.marker).toBe(2);
  expect(readdirSync(root)).toEqual(before);
});

test("reuses an unchanged config without replaying registrations", async () => {
  const root = mkdtempSync(join(tmpdir(), "damat-cached-config-"));
  roots.push(root);
  const config = join(root, "damat.config.ts");
  writeFileSync(config, "export default { marker: Symbol() };\n");
  const first = await loadConfigModule(config);
  const second = await loadConfigModule(config);
  expect(second).toBe(first);
});

test("reports configuration bundle failures", async () => {
  const root = mkdtempSync(join(tmpdir(), "damat-invalid-config-"));
  roots.push(root);
  const config = join(root, "damat.config.ts");
  writeFileSync(config, "export default {");
  await expect(loadConfigModule(config)).rejects.toThrow("Bundle failed");
});
