import { productionEnvironmentErrors } from "../src/operations/environment";
import { imagePolicyErrors } from "./image-policy";

const errors = [
  ...productionEnvironmentErrors(process.env, true),
  ...imagePolicyErrors(process.env),
];

if (errors.length) {
  console.error(`Production release gate failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Production environment and immutable image policy passed.");
