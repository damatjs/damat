import { verifyCoreLayout } from "./verify-link-split/core";
import { verification } from "./verify-link-split/helpers";
import { verifyOptionalLayouts } from "./verify-link-split/layouts";
import { verifyOwnership } from "./verify-link-split/ownership";

console.log("link-split verification:");
verifyCoreLayout();
verifyOwnership();
verifyOptionalLayouts();
if (verification.failures) {
  console.error(`\n${verification.failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll link-split checks passed.");
