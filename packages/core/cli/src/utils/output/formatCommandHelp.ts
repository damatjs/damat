export function formatCommandHelp(
  name: string,
  description: string,
  usage?: string,
): string {
  const padded = name.padEnd(20);
  let help = `${padded}${description}`;
  if (usage) {
    help += `\n${" ".repeat(20)}Usage: ${usage}`;
  }
  return help;
}
