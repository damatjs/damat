import { expect, test } from "bun:test";
import { createCommandRegistry } from "../registry";
import type { Command } from "../types";

function command(name: string): Command {
  return {
    name,
    description: `${name} command`,
    handler: async () => ({ exitCode: 0 }),
  };
}

test("command registries never share registrations", () => {
  const first = createCommandRegistry();
  const second = createCommandRegistry();

  first.register(command("alpha"));
  second.register(command("beta"));

  expect(first.get("alpha")).toBeDefined();
  expect(first.get("beta")).toBeUndefined();
  expect(second.get("beta")).toBeDefined();
  expect(second.get("alpha")).toBeUndefined();
});
