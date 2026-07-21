import { expect, test } from "bun:test";
import packageJson from "../../package.json";
import { CLI_VERSION } from "../version.generated";

test("embedded CLI version matches the published package", () => {
  expect(CLI_VERSION).toBe(packageJson.version);
});
