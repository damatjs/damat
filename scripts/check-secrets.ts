import { existsSync, readFileSync } from "node:fs";
import { scanText } from "./security/secrets";

const listed = Bun.spawnSync([
  "git",
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
]);
if (listed.exitCode !== 0) throw new Error(listed.stderr.toString());
const files = listed.stdout.toString().split("\0").filter(Boolean);
const ignored = /(^|\/)(bun\.lock|coverage|dist|\.next)(\/|$)/;
const findings = files.flatMap((file) => {
  if (ignored.test(file) || !existsSync(file)) return [];
  const data = readFileSync(file);
  if (data.includes(0)) return [];
  return scanText(file, data.toString("utf8"));
});

if (findings.length) {
  for (const finding of findings)
    console.error(`${finding.file}:${finding.line}: possible ${finding.kind}`);
  process.exit(1);
}
console.log(`Secret scan passed across ${files.length} release files.`);
