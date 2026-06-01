export function printSection(title: string, content: string[]): void {
  console.log(`\n${title}:`);
  for (const line of content) {
    console.log(`  ${line}`);
  }
}
