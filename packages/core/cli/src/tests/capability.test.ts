import { expect, test } from "bun:test";
import type { CliCapability } from "../types";
import * as cli from "../index";

test("capabilities preserve identity and compose commands in order", () => {
  const command = (name: string) => ({
    name,
    description: name,
    handler: async () => ({ exitCode: 0 }),
  });
  const one = { name: "one", commands: [command("first")] };
  const two = { name: "two", commands: [command("second")] };
  const define = Reflect.get(cli, "defineCliCapability") as (
    value: unknown,
  ) => CliCapability;
  const compose = Reflect.get(cli, "composeCliCapabilities") as (
    values: readonly CliCapability[],
  ) => Array<{ name: string }>;

  expect(define(one)).toBe(one);
  expect(compose([one, two]).map((command) => command.name)).toEqual([
    "first",
    "second",
  ]);
});
