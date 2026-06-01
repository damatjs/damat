export function resolveCommandName(args: string[]): string | null {
  if (args.length === 0) return null;
  const potentialCommand = args[0];
  if (!potentialCommand) return null;
  if (potentialCommand.startsWith("-")) return null;
  return potentialCommand;
}
