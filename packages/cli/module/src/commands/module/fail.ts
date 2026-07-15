import type { CommandContext, CommandResult } from "@damatjs/cli";

export function failCommand(ctx: CommandContext, message: string): CommandResult {
  ctx.logger.error(message);
  return { exitCode: 1 };
}
