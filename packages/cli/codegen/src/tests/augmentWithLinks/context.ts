import { describe, it, expect } from "bun:test";
import { join } from "node:path";
import { augmentWithLinks } from "../../commands/codegen/augmentWithLinks";

const FIX = join(import.meta.dir, "../__fixtures__");
const userModels = join(FIX, "userModels.ts");
const orgModels = join(FIX, "orgModels.ts");
const linkMod = join(FIX, "userOrgLink.ts");
const badLink = join(FIX, "badLink.ts");
const badLinkModule = join(FIX, "badLinkModule.ts");

function makeLogger() {
  const warnings: string[] = [];
  return { warn: (m: string) => warnings.push(m), warnings };
}
export {
  describe,
  it,
  expect,
  join,
  augmentWithLinks,
  FIX,
  userModels,
  orgModels,
  linkMod,
  badLink,
  badLinkModule,
  makeLogger,
};
