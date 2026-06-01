export interface ParsedCommand {
  name: string;
  args: string[];
  options: Record<string, unknown>;
}
