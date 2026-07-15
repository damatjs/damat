import { afterEach, beforeEach, createContext, describe, expect, it, kitAddCommand, kitCommand, kitInitCommand, kitValidateCommand, resetKitTests } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit command group", () => {
  it("registers the group with its alias and subcommands", () => {
    expect(kitCommand.name).toBe("kit");
    expect(kitCommand.aliases).toEqual(["k"]);
    expect(kitCommand.subcommands).toEqual([
      kitAddCommand,
      kitInitCommand,
      kitValidateCommand,
    ]);
  });

  it("prints the overview help and exits 0", async () => {
    const { ctx, logger } = createContext({});
    const res = await kitCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const help = logger.info.mock.calls[0]![0] as string;
    expect(help).toContain("damat kit init [name]");
    expect(help).toContain("damat kit validate");
    expect(help).toContain("damat kit add <source>");
    expect(help).toContain("--dry-run");
  });
});
