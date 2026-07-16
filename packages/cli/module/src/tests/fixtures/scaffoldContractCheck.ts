import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateModuleDir } from "@damatjs/module";
import { scaffoldModule } from "../../commands/module/init/scaffold";

const root = mkdtempSync(join(tmpdir(), "damat-scaffold-"));

try {
  scaffoldModule(root, "billing");
  postMessage({ errors: validateModuleDir(root).errors });
} finally {
  rmSync(root, { recursive: true, force: true });
}
