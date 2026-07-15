import type { CliDefinition, CliOutput, BannerConfig } from "../types";

function padRight(str: string, length: number): string {
  return str + " ".repeat(Math.max(0, length - str.length));
}

function repeat(char: string, count: number): string {
  return char.repeat(count);
}

export function printBanner(
  definition: CliDefinition,
  output: CliOutput,
  bannerConfig: BannerConfig = {},
): void {
  const style = bannerConfig.style ?? "boxed";
  const title = bannerConfig.title ?? definition.name ?? "CLI";
  const subtitle = bannerConfig.subtitle ?? definition.description ?? "";

  if (style === "none") return;

  if (style === "minimal") {
    output.write(`\n${title}\n${subtitle ? subtitle + "\n" : ""}`);
    return;
  }

  const titleLength = Math.max(title.length, subtitle.length);
  const boxWidth = Math.max(titleLength + 4, 60);
  const line = repeat("─", boxWidth);

  output.write(`\n┌${line}┐`);
  output.write(`│${padRight(`  ${title}`, boxWidth)}│`);

  if (subtitle) {
    output.write(`├${line}┤`);
    output.write(`│${padRight(`  ${subtitle}`, boxWidth)}│`);
  }

  output.write(`└${line}┘\n`);
}
