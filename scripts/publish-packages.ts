/** Pack and publish every public package with workspace ranges resolved. */
import { resolve } from "node:path";
import { isPublished, publicationSummary } from "./publish/commands";
import { publishPackage } from "./publish/package";
import { discoverPackages } from "./publish/workspaces";

const root = resolve(import.meta.dir, "..");
const options = {
  dryRun: process.argv.includes("--dry-run"),
  provenance: process.env.GITHUB_ACTIONS === "true",
};
const packages = discoverPackages(root);
console.log(
  `Found ${packages.length} public packages${options.dryRun ? " (dry run)" : ""}.`,
);

const failures: string[] = [];
let published = 0;
for (const pkg of packages) {
  const label = `${pkg.name}@${pkg.version}`;
  if (isPublished(pkg.name, pkg.version, root)) {
    console.log(`- ${label}: already published, skipping`);
    continue;
  }
  if (publishPackage(pkg, options)) published += 1;
  else failures.push(label);
}

console.log(
  `\nDone: ${publicationSummary(published, options.dryRun)}, ${failures.length} failed.`,
);
if (failures.length) {
  console.error(`Failed packages: ${failures.join(", ")}`);
  process.exit(1);
}
