import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  createReleaseConsumer,
  type ReleaseConsumer,
} from "../test/release-consumer/fixture";
import { verifyPackedMcp } from "../test/release-consumer/mcp";
import { exercisePackedModuleDev } from "../test/release-consumer/module-pty";
import { runProcess } from "../test/release-consumer/process";
import { verifyPackedSingleton } from "../test/release-consumer/singleton";

const enabled = process.env.DAMAT_RELEASE_CONSUMER_TEST === "1";
const releaseDescribe = enabled ? describe : describe.skip;
let consumer: ReleaseConsumer;

releaseDescribe("packed release consumer", () => {
  beforeAll(async () => {
    consumer = await createReleaseConsumer(resolve(import.meta.dir, "../.."));
  }, 120_000);

  afterAll(() => consumer?.cleanup());

  test("installs one shared framework registry", async () => {
    await verifyPackedSingleton(consumer.root);
  });

  test("runs module dev through a controlling PTY", async () => {
    await exercisePackedModuleDev(consumer.root, consumer.cli);
  }, 60_000);

  test("resolves MCP bare refs from the packed server", async () => {
    await verifyPackedMcp(consumer.root);
  });

  test("prints one verbose summary followed by one stack", async () => {
    const result = await runProcess(
      [process.execPath, consumer.cli, "--verbose", "module", "dev"],
      consumer.root,
      { ...process.env, NO_COLOR: "1" },
    );
    expect(result.code).toBe(1);
    expect(
      result.output.match(/Module development preflight failed:/g),
    ).toHaveLength(1);
    expect(
      result.output.match(/No damat.json or module.json found/g),
    ).toHaveLength(2);
    expect(result.output).toContain("at locateModuleDir");
  });
});
